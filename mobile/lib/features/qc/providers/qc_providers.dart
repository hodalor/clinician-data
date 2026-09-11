import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/models/remote_record_summary.dart';
import '../../dashboard/providers/dashboard_providers.dart';

final qcAssignedRecordsProvider =
    FutureProvider<List<RemoteRecordSummary>>((ref) async {
  return ref.watch(recordsRepositoryProvider).getRecords(
    statuses: const ['QC Required', 'Returned for Correction'],
  );
});
