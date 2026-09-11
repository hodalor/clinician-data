import 'package:dio/dio.dart';
import '../local/auth_session_storage.dart';
import '../models/auth_login_result.dart';
import '../models/auth_session.dart';
import '../remote/auth_api.dart';

class AuthRepository {
  AuthRepository({
    required AuthApi authApi,
    required AuthSessionStorage sessionStorage,
  })  : _authApi = authApi,
        _sessionStorage = sessionStorage;

  final AuthApi _authApi;
  final AuthSessionStorage _sessionStorage;

  Future<AuthLoginResult> login({
    required String email,
    required String password,
    bool isApprovalPoll = false,
  }) async {
    final deviceId = await _sessionStorage.readOrCreateDeviceId();
    final result = await _authApi.login(
      email: email,
      password: password,
      deviceId: deviceId,
      isApprovalPoll: isApprovalPoll,
    );

    if (result.status == AuthLoginStatus.authenticated && result.session != null) {
      final session = result.session!;
      await _authApi.registerDevice(session: session);
      await _sessionStorage.writeSession(session);
    }

    return result;
  }

  Future<AuthSession?> refresh() async {
    final current = await _sessionStorage.readSession();
    if (current == null) {
      return null;
    }

    try {
      final refreshed = await _authApi.refresh(
        refreshToken: current.refreshToken,
        deviceId: current.deviceId,
        user: current.user,
      );
      await _sessionStorage.writeSession(refreshed);
      return refreshed;
    } on DioException {
      await _sessionStorage.clearSession();
      rethrow;
    }
  }

  Future<void> logout({bool remote = true}) async {
    final session = await _sessionStorage.readSession();

    if (remote && session != null) {
      try {
        await _authApi.logout(refreshToken: session.refreshToken);
      } on DioException {
        // Local session clearing is more important than surfacing a logout error.
      }
    }

    await _sessionStorage.clearSession();
  }
}
