import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/destination_option.dart';

class DestinationCacheStorage {
  DestinationCacheStorage()
      : _storage = const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
        );

  static const _destinationOptionsKey = 'destination_options_cache_v1';

  final FlutterSecureStorage _storage;

  Future<List<DestinationOption>> readCachedOptions() async {
    final raw = await _storage.read(key: _destinationOptionsKey);
    if (raw == null || raw.isEmpty) {
      return const [];
    }

    final decoded = jsonDecode(raw) as List<dynamic>;
    return decoded
        .whereType<Map<String, dynamic>>()
        .map(DestinationOption.fromJson)
        .toList(growable: false);
  }

  Future<void> writeCachedOptions(List<DestinationOption> options) {
    return _storage.write(
      key: _destinationOptionsKey,
      value: jsonEncode(options.map((option) => option.toJson()).toList()),
    );
  }
}
