import 'package:dio/dio.dart';
import '../local/destination_cache_storage.dart';
import '../models/destination_option.dart';

class DestinationRepository {
  DestinationRepository({
    required Dio dio,
    required DestinationCacheStorage cacheStorage,
  })  : _dio = dio,
        _cacheStorage = cacheStorage;

  final Dio _dio;
  final DestinationCacheStorage _cacheStorage;

  Future<List<DestinationOption>> fetchApprovedDestinations() async {
    try {
      final response =
          await _dio.get<dynamic>('/records/metadata/destinations');
      final options = _parseOptions(response.data);
      if (options.isNotEmpty) {
        await _cacheStorage.writeCachedOptions(options);
        return options;
      }
    } on DioException {
      // Fall back to cached options below.
    }

    return _cacheStorage.readCachedOptions();
  }

  List<DestinationOption> _parseOptions(dynamic payload) {
    final data = payload is Map<String, dynamic>
        ? payload['data'] ??
            payload['items'] ??
            payload['destinations'] ??
            payload
        : payload;

    if (data is List) {
      return data
          .whereType<Map<String, dynamic>>()
          .map(DestinationOption.fromJson)
          .where((option) => option.code.isNotEmpty && option.label.isNotEmpty)
          .toList(growable: false);
    }

    return const [];
  }
}
