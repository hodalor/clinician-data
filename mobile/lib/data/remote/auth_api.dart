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
    final status = data['status'];

    if (status == 'pending_approval') {
      return AuthLoginResult.pendingApproval(
        requestId: data['request_id'] as String?,
        message: data['message'] as String?,
      );
    }

    if (status == 'rejected') {
      return AuthLoginResult.rejected(
        requestId: data['request_id'] as String?,
        message: data['message'] as String?,
      );
    }

    return AuthLoginResult.authenticated(
      AuthSession(
        accessToken: data['access_token'] as String,
        refreshToken: data['refresh_token'] as String,
        deviceId: deviceId,
        user: AuthUser.fromJson(data['user'] as Map<String, dynamic>),
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
    return AuthSession(
      accessToken: data['access_token'] as String,
      refreshToken: data['refresh_token'] as String,
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
}
