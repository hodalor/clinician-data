import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/local/app_database.dart';
import '../../../data/remote/authenticated_api_client.dart';
import '../../../data/remote/sync_api.dart';
import '../../../data/repositories/sync_repository.dart';
import '../../abstraction/providers/abstraction_providers.dart';

void _debugReportSync({
  required String hypothesisId,
  required String location,
  required String message,
  Map<String, dynamic>? data,
}) {
  // #region debug-point A:sync-manager-report
  final client = HttpClient();
  unawaited(
    client
        .postUrl(Uri.parse('http://172.20.10.10:7777/event'))
        .then(
          (request) {
            request.headers.contentType = ContentType.json;
            request.add(
              utf8.encode(
                jsonEncode({
                  'sessionId': 'sync-flicker',
                  'runId': 'pre-fix',
                  'hypothesisId': hypothesisId,
                  'location': location,
                  'msg': '[DEBUG] $message',
                  'data': data ?? <String, dynamic>{},
                  'ts': DateTime.now().millisecondsSinceEpoch,
                }),
              ),
            );
            return request.close();
          },
        )
        .then((response) => response.drain<void>())
        .catchError((_) {})
        .whenComplete(client.close),
  );
  // #endregion
}

class SyncManagerState {
  const SyncManagerState({
    this.isSyncing = false,
    this.lastRunAt,
    this.message,
  });

  final bool isSyncing;
  final DateTime? lastRunAt;
  final String? message;

  SyncManagerState copyWith({
    bool? isSyncing,
    DateTime? lastRunAt,
    String? message,
  }) {
    return SyncManagerState(
      isSyncing: isSyncing ?? this.isSyncing,
      lastRunAt: lastRunAt ?? this.lastRunAt,
      message: message ?? this.message,
    );
  }
}

final syncApiProvider = Provider<SyncApi>((ref) {
  return SyncApi(ref.watch(authenticatedDioProvider));
});

final syncRepositoryProvider = Provider<SyncRepository>((ref) {
  return SyncRepository(
    draftRepository: ref.watch(draftRepositoryProvider),
    syncApi: ref.watch(syncApiProvider),
  );
});

class SyncManager extends Notifier<SyncManagerState> {
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  Timer? _retryTimer;

  @override
  SyncManagerState build() {
    _connectivitySubscription ??=
        Connectivity().onConnectivityChanged.listen(_handleConnectivityChange);
    ref.onDispose(() {
      _retryTimer?.cancel();
      _connectivitySubscription?.cancel();
    });
    unawaited(_scheduleNextRetry());
    return const SyncManagerState();
  }

  Future<void> syncNow() async {
    await _runSync(manual: true);
  }

  Future<void> retryRecord(int recordId) async {
    await _runSync(manual: true, recordId: recordId);
  }

  Future<void> _runSync({
    required bool manual,
    int? recordId,
  }) async {
    // #region debug-point C:sync-run-entry
    _debugReportSync(
      hypothesisId: 'C',
      location: 'sync_providers.dart:_runSync:entry',
      message: 'Sync run requested',
      data: {
        'manual': manual,
        'recordId': recordId,
        'isSyncing': state.isSyncing,
      },
    );
    // #endregion
    if (state.isSyncing) {
      // #region debug-point D:sync-overlap-guard
      _debugReportSync(
        hypothesisId: 'D',
        location: 'sync_providers.dart:_runSync:overlap',
        message: 'Sync request ignored because a run is already active',
        data: {
          'manual': manual,
          'recordId': recordId,
        },
      );
      // #endregion
      return;
    }

    state = state.copyWith(
      isSyncing: true,
      message: manual ? 'Syncing records...' : 'Retrying pending syncs...',
    );

    try {
      while (true) {
        final bundles =
            await ref.read(syncRepositoryProvider).getPendingBundles(
                  readyAt: manual ? null : DateTime.now(),
                  limit: 10,
                  recordId: recordId,
                );

        // #region debug-point C:pending-bundle-count
        _debugReportSync(
          hypothesisId: 'C',
          location: 'sync_providers.dart:_runSync:bundles',
          message: 'Loaded pending bundles for sync',
          data: {
            'manual': manual,
            'recordId': recordId,
            'bundleCount': bundles.length,
          },
        );
        // #endregion

        if (bundles.isEmpty) {
          break;
        }

        await ref.read(syncRepositoryProvider).markSyncAttemptStarted(
            bundles.map((bundle) => bundle.record.id).toList());

        final response =
            await ref.read(syncRepositoryProvider).syncBundles(bundles);
        final results = (response['results'] as List?) ?? const [];

        // #region debug-point A:sync-response-summary
        _debugReportSync(
          hypothesisId: 'A',
          location: 'sync_providers.dart:_runSync:response',
          message: 'Received sync response',
          data: {
            'resultCount': results.length,
            'hasConflicts': response['has_conflicts'],
            'hasErrors': response['has_errors'],
          },
        );
        // #endregion
        final bundleByUuid = {
          for (final bundle in bundles) bundle.record.clientUuid: bundle,
        };

        for (final item in results.whereType<Map<String, dynamic>>()) {
          final clientUuid = item['client_uuid']?.toString();
          if (clientUuid == null) {
            continue;
          }
          final bundle = bundleByUuid[clientUuid];
          if (bundle == null) {
            continue;
          }
          final result = item['result']?.toString() ?? 'error';
          final errors = ((item['errors'] as List?) ?? const [])
              .map((entry) => entry.toString())
              .toList(growable: false);
          final errorDetail =
              errors.isEmpty ? 'Sync failed' : errors.join('\n');

          switch (result) {
            case 'success':
              await ref
                  .read(syncRepositoryProvider)
                  .markSyncSuccess(bundle.record.id);
              break;
            case 'conflict':
              await ref.read(syncRepositoryProvider).markSyncConflict(
                    recordId: bundle.record.id,
                    errorDetail: errorDetail,
                  );
              break;
            default:
              await ref.read(syncRepositoryProvider).markSyncFailure(
                    record: bundle.record,
                    errorDetail: errorDetail,
                  );
              break;
          }
        }

        if (recordId != null) {
          break;
        }
      }

      state = state.copyWith(
        isSyncing: false,
        lastRunAt: DateTime.now(),
        message: 'Sync finished.',
      );
    } catch (error) {
      state = state.copyWith(
        isSyncing: false,
        lastRunAt: DateTime.now(),
        message: error.toString(),
      );
    } finally {
      // #region debug-point C:sync-finalize
      _debugReportSync(
        hypothesisId: 'C',
        location: 'sync_providers.dart:_runSync:finally',
        message: 'Sync run finalizing and invalidating providers',
        data: {
          'manual': manual,
          'recordId': recordId,
          'lastMessage': state.message,
        },
      );
      // #endregion
      await _scheduleNextRetry();
      ref.invalidate(localRecordListProvider);
      ref.invalidate(draftListProvider);
    }
  }

  Future<void> _scheduleNextRetry() async {
    _retryTimer?.cancel();
    final nextRetryAt =
        await ref.read(draftRepositoryProvider).getNextRetryAt();
    if (nextRetryAt == null) {
      return;
    }

    final delay = nextRetryAt.difference(DateTime.now());
    final effectiveDelay = delay.isNegative ? Duration.zero : delay;
    _retryTimer = Timer(effectiveDelay, () {
      unawaited(_runSync(manual: false));
    });
  }

  Future<void> _handleConnectivityChange(
    List<ConnectivityResult> results,
  ) async {
    if (results.any((result) => result != ConnectivityResult.none)) {
      await _runSync(manual: false);
    }
  }
}

final syncManagerProvider =
    NotifierProvider<SyncManager, SyncManagerState>(SyncManager.new);

final syncStatusRecordsProvider = StreamProvider<List<ResearchRecord>>((ref) {
  return ref.watch(draftRepositoryProvider).watchAllRecords();
});
