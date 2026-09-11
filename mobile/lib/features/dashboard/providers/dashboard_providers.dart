import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/utils/record_constants.dart';
import '../../../data/models/active_assignment.dart';
import '../../../data/models/remote_record_summary.dart';
import '../../../data/remote/authenticated_api_client.dart';
import '../../../data/remote/records_api.dart';
import '../../../data/repositories/records_repository.dart';
import '../../abstraction/providers/abstraction_providers.dart';

final recordsApiProvider = Provider<RecordsApi>((ref) {
  return RecordsApi(ref.watch(authenticatedDioProvider));
});

final recordsRepositoryProvider = Provider<RecordsRepository>((ref) {
  return RecordsRepository(ref.watch(recordsApiProvider));
});

final activeAssignmentProvider = FutureProvider<ActiveAssignment?>((ref) {
  return ref.watch(recordsRepositoryProvider).getActiveAssignment();
});

final remoteRecordListProvider =
    FutureProvider<List<RemoteRecordSummary>>((ref) async {
  return ref.watch(recordsRepositoryProvider).getRecords(
        statuses: researchRecordStatuses,
      );
});

class DashboardSummary {
  const DashboardSummary({
    required this.assigned,
    required this.completed,
    required this.remaining,
    required this.synced,
    required this.pendingSync,
    required this.returnedByQc,
  });

  final int assigned;
  final int completed;
  final int remaining;
  final int synced;
  final int pendingSync;
  final int returnedByQc;
}

final raDashboardSummaryProvider = Provider<DashboardSummary>((ref) {
  final records = ref.watch(localRecordListProvider).valueOrNull ?? const [];
  final assigned = records.length;
  final completed = records
      .where(
        (record) => const [
          'Complete',
          'Verified',
          'Locked',
          'Excluded',
        ].contains(record.status),
      )
      .length;
  final synced = records.where((record) => record.syncState == 'synced').length;
  final pendingSync =
      records.where((record) => record.syncState == 'pending').length;
  final returnedByQc = records
      .where((record) => record.status == 'Returned for Correction')
      .length;

  return DashboardSummary(
    assigned: assigned,
    completed: completed,
    remaining: assigned - completed,
    synced: synced,
    pendingSync: pendingSync,
    returnedByQc: returnedByQc,
  );
});

final draftQueueProvider = StreamProvider((ref) {
  return ref.watch(draftRepositoryProvider).watchRecordsByStatus('Draft');
});

final pendingOutcomeQueueProvider = StreamProvider((ref) {
  return ref
      .watch(draftRepositoryProvider)
      .watchRecordsByStatus('Clinical Data Complete - Outcome Pending');
});

final pendingSyncQueueProvider = StreamProvider((ref) {
  return ref.watch(draftRepositoryProvider).watchRecordsBySyncState('pending');
});

final syncFailedQueueProvider = StreamProvider((ref) {
  return ref.watch(draftRepositoryProvider).watchRecordsBySyncState('failed');
});

final returnedByQcQueueProvider = StreamProvider((ref) {
  return ref
      .watch(draftRepositoryProvider)
      .watchRecordsByStatus('Returned for Correction');
});
