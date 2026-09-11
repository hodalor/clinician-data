import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';
import '../models/auth_session.dart';

class AuthSessionStorage {
  AuthSessionStorage()
      : _storage = const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
        );

  static const _sessionKey = 'auth_session_v1';
  static const _deviceIdKey = 'stable_device_id_v1';
  static const _pinHashKey = 'local_unlock_pin_hash_v1';
  static const _biometricEnabledKey = 'biometric_unlock_enabled_v1';
  static const _lockPromptDismissedKey = 'lock_prompt_dismissed_v1';

  final FlutterSecureStorage _storage;
  final Uuid _uuid = const Uuid();

  Future<AuthSession?> readSession() async {
    final raw = await _storage.read(key: _sessionKey);
    if (raw == null || raw.isEmpty) {
      return null;
    }

    return AuthSession.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  Future<void> writeSession(AuthSession session) {
    return _storage.write(
      key: _sessionKey,
      value: jsonEncode(session.toJson()),
    );
  }

  Future<void> clearSession() {
    return _storage.delete(key: _sessionKey);
  }

  Future<String> readOrCreateDeviceId() async {
    final existing = await _storage.read(key: _deviceIdKey);
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }

    final deviceId = _uuid.v4();
    await _storage.write(key: _deviceIdKey, value: deviceId);
    return deviceId;
  }

  Future<void> savePin(String pin) {
    return _storage.write(key: _pinHashKey, value: _hash(pin));
  }

  Future<bool> verifyPin(String pin) async {
    final storedHash = await _storage.read(key: _pinHashKey);
    if (storedHash == null || storedHash.isEmpty) {
      return false;
    }

    return storedHash == _hash(pin);
  }

  Future<bool> hasPin() async {
    final storedHash = await _storage.read(key: _pinHashKey);
    return storedHash != null && storedHash.isNotEmpty;
  }

  Future<void> clearPin() {
    return _storage.delete(key: _pinHashKey);
  }

  Future<bool> isBiometricUnlockEnabled() async {
    final raw = await _storage.read(key: _biometricEnabledKey);
    return raw == 'true';
  }

  Future<void> setBiometricUnlockEnabled(bool enabled) {
    return _storage.write(
      key: _biometricEnabledKey,
      value: enabled ? 'true' : 'false',
    );
  }

  Future<bool> isLockPromptDismissed() async {
    final raw = await _storage.read(key: _lockPromptDismissedKey);
    return raw == 'true';
  }

  Future<void> setLockPromptDismissed(bool dismissed) {
    return _storage.write(
      key: _lockPromptDismissedKey,
      value: dismissed ? 'true' : 'false',
    );
  }

  String _hash(String value) {
    return sha256.convert(utf8.encode(value)).toString();
  }
}
