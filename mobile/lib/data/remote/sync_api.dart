import 'package:dio/dio.dart';

class SyncApi {
  SyncApi(this._dio);

  final Dio _dio;

  Future<Map<String, dynamic>> syncRecords(
    List<Map<String, dynamic>> records,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/sync/records',
      data: {
        'records': records,
      },
    );

    return response.data ?? const <String, dynamic>{};
  }
}
