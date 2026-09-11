import 'package:dio/dio.dart';
import '../models/active_assignment.dart';
import '../models/remote_record_summary.dart';
import '../remote/records_api.dart';

class RecordsRepository {
  RecordsRepository(this._api);

  final RecordsApi _api;

  Future<ActiveAssignment?> getActiveAssignment() async {
    try {
      return await _api.getActiveAssignment();
    } on DioException {
      return null;
    }
  }

  Future<List<RemoteRecordSummary>> getRecords({
    List<String>? statuses,
  }) {
    return _api.getRecords(statuses: statuses);
  }

  Future<QcComparisonResult> getQcComparison(String recordId) {
    return _api.getQcComparison(recordId);
  }

  Future<void> submitQcReabstract({
    required String recordId,
    required Map<String, dynamic> values,
  }) {
    return _api.submitQcReabstract(recordId: recordId, values: values);
  }

  Future<void> resolveQc({
    required String recordId,
    required String action,
    Map<String, dynamic>? correctedValues,
    String? reason,
    String? qcComment,
  }) {
    return _api.resolveQc(
      recordId: recordId,
      action: action,
      correctedValues: correctedValues,
      reason: reason,
      qcComment: qcComment,
    );
  }
}
