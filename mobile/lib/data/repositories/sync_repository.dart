import 'dart:convert';
import 'dart:io';
import 'package:drift/drift.dart' as drift;
import '../local/app_database.dart';
import '../../features/abstraction/utils/record_payload_mapper.dart';
import '../remote/sync_api.dart';
import 'draft_repository.dart';

void _debugReportSyncPayload({
  required String hypothesisId,
  required String location,
  required String message,
  Map<String, dynamic>? data,
}) {
  // #region debug-point A:sync-payload-report
  final client = HttpClient();
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
      .whenComplete(client.close);
  // #endregion
}

class SyncRepository {
  SyncRepository({
    required DraftRepository draftRepository,
    required SyncApi syncApi,
  })  : _draftRepository = draftRepository,
        _syncApi = syncApi;

  final DraftRepository _draftRepository;
  final SyncApi _syncApi;

  Future<List<DraftRecordBundle>> getPendingBundles({
    DateTime? readyAt,
    int limit = 20,
    int? recordId,
  }) async {
    final records = await _draftRepository.getRecordsPendingSync(
      readyAt: readyAt,
      limit: limit,
      recordId: recordId,
    );

    final bundles = await Future.wait(
      records.map((record) => _draftRepository.getDraftBundle(record.id)),
    );

    return bundles.whereType<DraftRecordBundle>().toList(growable: false);
  }

  Future<Map<String, dynamic>> syncBundles(List<DraftRecordBundle> bundles) {
    final payload = bundles
        .map(
          (bundle) => {
            'client_uuid': bundle.record.clientUuid,
            'version': bundle.record.version,
            'record': buildSyncRecordPayloadFromBundle(bundle),
            if (buildOutcomePayloadFromBundle(bundle) != null)
              'outcome': buildOutcomePayloadFromBundle(bundle),
          },
        )
        .toList(growable: false);

    // #region debug-point A:sync-payload-shape
    _debugReportSyncPayload(
      hypothesisId: 'A',
      location: 'sync_repository.dart:syncBundles',
      message: 'Prepared sync payload batch',
      data: {
        'bundleCount': bundles.length,
        'items': payload
            .map(
              (item) => {
                'client_uuid': item['client_uuid'],
                'recordKeys': (item['record'] as Map<String, dynamic>).keys.toList(),
                'hasOutcome': item.containsKey('outcome'),
                'outcomeKeys': item.containsKey('outcome')
                    ? ((item['outcome'] as Map<String, dynamic>).keys.toList())
                    : const [],
              },
            )
            .toList(growable: false),
      },
    );
    // #endregion

    return _syncApi.syncRecords(payload);
  }

  Future<void> markSyncAttemptStarted(List<int> recordIds) async {
    final now = DateTime.now();
    await Future.wait(
      recordIds.map(
        (recordId) => _draftRepository.updateSyncMetadata(
          recordId,
          ResearchRecordsCompanion(
            syncState: const drift.Value('syncing'),
            lastSyncAttemptAt: drift.Value(now),
            syncErrorDetail: const drift.Value(null),
            updatedAt: drift.Value(now),
          ),
        ),
      ),
    );
  }

  Future<void> markSyncSuccess(int recordId) async {
    final now = DateTime.now();
    await _draftRepository.updateSyncMetadata(
      recordId,
      ResearchRecordsCompanion(
        syncState: const drift.Value('synced'),
        syncErrorDetail: const drift.Value(null),
        syncAttemptCount: const drift.Value(0),
        lastSyncedAt: drift.Value(now),
        nextRetryAt: const drift.Value(null),
        updatedAt: drift.Value(now),
      ),
    );
  }

  Future<void> markSyncConflict({
    required int recordId,
    required String errorDetail,
  }) async {
    final now = DateTime.now();
    await _draftRepository.updateSyncMetadata(
      recordId,
      ResearchRecordsCompanion(
        status: const drift.Value('Needs Review'),
        syncState: const drift.Value('conflict'),
        syncErrorDetail: drift.Value(errorDetail),
        nextRetryAt: const drift.Value(null),
        updatedAt: drift.Value(now),
      ),
    );
  }

  Future<void> markSyncFailure({
    required ResearchRecord record,
    required String errorDetail,
  }) async {
    final nextAttemptCount = record.syncAttemptCount + 1;
    final nextRetryAt = DateTime.now().add(
      Duration(
        seconds: _computeBackoffSeconds(nextAttemptCount),
      ),
    );

    await _draftRepository.updateSyncMetadata(
      record.id,
      ResearchRecordsCompanion(
        syncState: const drift.Value('failed'),
        syncErrorDetail: drift.Value(errorDetail),
        syncAttemptCount: drift.Value(nextAttemptCount),
        nextRetryAt: drift.Value(nextRetryAt),
        updatedAt: drift.Value(DateTime.now()),
      ),
    );
  }

  int _computeBackoffSeconds(int attemptCount) {
    final exponent = attemptCount <= 1 ? 0 : attemptCount - 1;
    final seconds = 30 * (1 << exponent);
    return seconds > 15 * 60 ? 15 * 60 : seconds;
  }
}
