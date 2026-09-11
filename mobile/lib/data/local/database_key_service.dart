import 'dart:math';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class DatabaseKeyService {
  DatabaseKeyService()
      : _storage = const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
        );

  static const _databaseKeyStorageKey = 'sue_mobile_db_key_v1';

  final FlutterSecureStorage _storage;

  Future<String> readOrCreateDatabaseKey() async {
    final existing = await _storage.read(key: _databaseKeyStorageKey);
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }

    final random = Random.secure();
    final bytes = List<int>.generate(32, (_) => random.nextInt(256));
    final hexKey =
        bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join();

    await _storage.write(key: _databaseKeyStorageKey, value: hexKey);
    return hexKey;
  }
}
