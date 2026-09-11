import 'package:dio/dio.dart';
import '../models/active_assignment.dart';
import '../models/remote_record_summary.dart';

class RecordsApi {
  RecordsApi(this._dio);

  final Dio _dio;

  Future<ActiveAssignment> getActiveAssignment() async {
    final response =
        await _dio.get<Map<String, dynamic>>('/assignments/active');
    return ActiveAssignment.fromJson(response.data ?? const {});
  }

  Future<List<RemoteRecordSummary>> getRecords({
    List<String>? statuses,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/records',
      queryParameters: statuses == null || statuses.isEmpty
          ? null
          : {
              'status': statuses.join(','),
            },
    );

    final data = (response.data?['data'] as List?) ?? const [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(RemoteRecordSummary.fromJson)
        .toList(growable: false);
  }

  Future<QcComparisonResult> getQcComparison(String recordId) async {
    final response =
        await _dio.get<Map<String, dynamic>>('/qc/$recordId/compare');
    return QcComparisonResult.fromJson(response.data ?? const {});
  }

  Future<void> submitQcReabstract({
    required String recordId,
    required Map<String, dynamic> values,
  }) async {
    await _dio.post<void>(
      '/qc/$recordId/reabstract',
      data: {
        're_abstracted_values': values,
      },
    );
  }

  Future<void> resolveQc({
    required String recordId,
    required String action,
    Map<String, dynamic>? correctedValues,
    String? reason,
    String? qcComment,
  }) async {
    await _dio.post<void>(
      '/qc/$recordId/resolve',
      data: {
        'action': action,
        if (correctedValues != null) 'corrected_values': correctedValues,
        if (reason != null && reason.isNotEmpty) 'reason': reason,
        if (qcComment != null && qcComment.isNotEmpty) 'qc_comment': qcComment,
      },
    );
  }
}
