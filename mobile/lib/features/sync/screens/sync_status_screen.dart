import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../data/local/app_database.dart';
import '../providers/sync_providers.dart';

void _debugReportSyncStatus({
  required String hypothesisId,
  required String location,
  required String message,
  Map<String, dynamic>? data,
}) {
  // #region debug-point C:sync-status-report
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

class SyncStatusScreen extends ConsumerWidget {
  const SyncStatusScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncState = ref.watch(syncManagerProvider);
    final recordsAsync = ref.watch(syncStatusRecordsProvider);

    // #region debug-point C:sync-status-build
    _debugReportSyncStatus(
      hypothesisId: 'C',
      location: 'sync_status_screen.dart:build',
      message: 'Sync Status screen rebuilt',
      data: {
        'isSyncing': syncState.isSyncing,
        'message': syncState.message,
        'recordsState': recordsAsync.when(
          data: (records) => 'data:${records.length}',
          loading: () => 'loading',
          error: (error, _) => 'error:$error',
        ),
      },
    );
    // #endregion

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sync Status'),
        actions: [
          TextButton(
            onPressed: syncState.isSyncing
                ? null
                : () => ref.read(syncManagerProvider.notifier).syncNow(),
            child: const Text('Sync now'),
          ),
        ],
      ),
      body: Column(
        children: [
          if (syncState.message?.isNotEmpty == true)
            Container(
              width: double.infinity,
              color: const Color(0xFFF7F7F7),
              padding: const EdgeInsets.all(12),
              child: Text(syncState.message!),
            ),
          Expanded(
            child: recordsAsync.when(
              data: (records) {
                if (records.isEmpty) {
                  return const Center(
                    child: Text('No records saved on this device yet.'),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: records.length,
                  itemBuilder: (context, index) {
                    final record = records[index];
                    return _SyncRecordCard(record: record);
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text('Could not load sync status: $error'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SyncRecordCard extends ConsumerWidget {
  const _SyncRecordCard({
    required this.record,
  });

  final ResearchRecord record;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              record.studyId,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text('Workflow: ${record.status}'),
            Text('Sync: ${_labelForSyncState(record.syncState)}'),
            Text(
              'Last attempt: ${record.lastSyncAttemptAt == null ? 'Never' : DateFormat('dd MMM yyyy HH:mm').format(record.lastSyncAttemptAt!)}',
            ),
            if (record.syncErrorDetail?.isNotEmpty == true) ...[
              const SizedBox(height: 8),
              Text(
                record.syncErrorDetail!,
                style: const TextStyle(color: Color(0xFFB71C1C)),
              ),
            ],
            const SizedBox(height: 12),
            if (record.syncState == 'failed' || record.syncState == 'conflict')
              Align(
                alignment: Alignment.centerRight,
                child: OutlinedButton(
                  onPressed: () => ref
                      .read(syncManagerProvider.notifier)
                      .retryRecord(record.id),
                  child: const Text('Retry this record'),
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _labelForSyncState(String syncState) {
    switch (syncState) {
      case 'pending':
        return 'Pending Sync';
      case 'syncing':
        return 'Syncing';
      case 'synced':
        return 'Synced';
      case 'failed':
        return 'Sync Failed';
      case 'conflict':
        return 'Needs Review';
      default:
        return syncState;
    }
  }
}
