import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/providers/auth_providers.dart';
import '../models/auth_session.dart';
import 'api_client.dart';

final authenticatedDioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: ref.watch(apiClientProvider).dio.options.baseUrl,
    connectTimeout: const Duration(seconds: 20),
    receiveTimeout: const Duration(seconds: 20),
    sendTimeout: const Duration(seconds: 20),
    contentType: Headers.jsonContentType,
    responseType: ResponseType.json,
  ));

  dio.interceptors.add(
    QueuedInterceptorsWrapper(
      onRequest: (options, handler) async {
        final session =
            await ref.read(authSessionStorageProvider).readSession();
        if (session != null) {
          options.headers['Authorization'] = 'Bearer ${session.accessToken}';
          options.headers['x-device-id'] = session.deviceId;
        }

        handler.next(options);
      },
      onError: (error, handler) async {
        if (_shouldAttemptRefresh(error)) {
          final refreshed = await ref
              .read(authControllerProvider.notifier)
              .tryRefreshSession();

          if (refreshed) {
            final session =
                await ref.read(authSessionStorageProvider).readSession();
            if (session != null) {
              final retryResponse = await _retryRequest(
                dio: dio,
                requestOptions: error.requestOptions,
                session: session,
              );
              handler.resolve(retryResponse);
              return;
            }
          }
        }

        handler.next(error);
      },
    ),
  );

  return dio;
});

bool _shouldAttemptRefresh(DioException error) {
  final path = error.requestOptions.path;
  final isAuthPath = path.contains('/auth/login') ||
      path.contains('/auth/refresh') ||
      path.contains('/auth/logout');
  final alreadyRetried = error.requestOptions.extra['retried'] == true;

  return error.response?.statusCode == 401 && !isAuthPath && !alreadyRetried;
}

Future<Response<dynamic>> _retryRequest({
  required Dio dio,
  required RequestOptions requestOptions,
  required AuthSession session,
}) {
  final options = Options(
    method: requestOptions.method,
    headers: {
      ...requestOptions.headers,
      'Authorization': 'Bearer ${session.accessToken}',
      'x-device-id': session.deviceId,
    },
    responseType: requestOptions.responseType,
    contentType: requestOptions.contentType,
    extra: {
      ...requestOptions.extra,
      'retried': true,
    },
  );

  return dio.request<dynamic>(
    requestOptions.path,
    data: requestOptions.data,
    queryParameters: requestOptions.queryParameters,
    options: options,
  );
}
