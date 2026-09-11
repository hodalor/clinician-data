import 'package:dio/dio.dart';
import '../models/auth_login_result.dart';
import '../models/auth_session.dart';
import 'api_client.dart';

class AuthApi {
  AuthApi(this._apiClient);

  final ApiClient _apiClient;

  Future<AuthLoginResult> login({
    required String email,
    required String password,
    required String deviceId,
    bool isApprovalPoll = false,
  }) async {
    final response = await _apiClient.dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {
        'email': email,
        'password': password,
      },
      options: Options(
        headers: {
          'x-device-id': deviceId,
          if (isApprovalPoll) 'x-device-request-poll': 'true',
        },
      ),
    );

    final data = response.data ?? <String, dynamic>{};
    final status = _readOptionalString(data['status']);

    if (status == 'pending_approval') {
      return AuthLoginResult.pendingApproval(
        requestId: _readOptionalString(data['request_id']),
        message: _readOptionalString(data['message']),
      );
    }

    if (status == 'rejected') {
      return AuthLoginResult.rejected(
        requestId: _readOptionalString(data['request_id']),
        message: _readOptionalString(data['message']),
      );
    }

    final accessToken = _readOptionalString(data['access_token']);
    final refreshToken = _readOptionalString(data['refresh_token']);
    final userJson = data['user'];

    if (accessToken == null || refreshToken == null || userJson is! Map) {
      final message =
          _readOptionalString(data['message']) ??
          'Login response was missing the expected authentication data.';
      throw FormatException(message);
    }

    return AuthLoginResult.authenticated(
      AuthSession(
        accessToken: accessToken,
        refreshToken: refreshToken,
        deviceId: deviceId,
        user: AuthUser.fromJson(Map<String, dynamic>.from(userJson)),
      ),
    );
  }

  Future<void> registerDevice({
    required AuthSession session,
  }) async {
    await _apiClient.dio.post<void>(
      '/devices/register',
      data: {
        'device_id': session.deviceId,
      },
      options: Options(
        headers: {
          'Authorization': 'Bearer ${session.accessToken}',
          'x-device-id': session.deviceId,
        },
      ),
    );
  }

  Future<AuthSession> refresh({
    required String refreshToken,
    required AuthUser user,
    required String deviceId,
  }) async {
    final response = await _apiClient.dio.post<Map<String, dynamic>>(
      '/auth/refresh',
      data: {
        'refresh_token': refreshToken,
      },
    );

    final data = response.data ?? <String, dynamic>{};
    final accessToken = _readOptionalString(data['access_token']);
    final refreshTokenValue = _readOptionalString(data['refresh_token']);

    if (accessToken == null || refreshTokenValue == null) {
      throw const FormatException(
        'Refresh response was missing authentication tokens.',
      );
    }

    return AuthSession(
      accessToken: accessToken,
      refreshToken: refreshTokenValue,
      deviceId: deviceId,
      user: user,
    );
  }

  Future<void> logout({
    required String refreshToken,
  }) async {
    await _apiClient.dio.post<void>(
      '/auth/logout',
      data: {
        'refresh_token': refreshToken,
      },
    );
  }

  String? _readOptionalString(Object? value) {
    if (value is! String) {
      return null;
    }

    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
}
