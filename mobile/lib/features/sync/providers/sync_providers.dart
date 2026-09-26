import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/local/app_database.dart';
import '../../../data/remote/authenticated_api_client.dart';
import '../../../data/remote/sync_api.dart';
import '../../../data/repositories/sync_repository.dart';
import '../../abstraction/providers/abstraction_providers.dart';

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
    if (state.isSyncing) {
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

        if (bundles.isEmpty) {
          break;
        }

        await ref.read(syncRepositoryProvider).markSyncAttemptStarted(
            bundles.map((bundle) => bundle.record.id).toList());

        final response =
            await ref.read(syncRepositoryProvider).syncBundles(bundles);
        final results = (response['results'] as List?) ?? const [];
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
