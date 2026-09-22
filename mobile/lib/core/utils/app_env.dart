import 'package:flutter_dotenv/flutter_dotenv.dart';

final class AppEnv {
  const AppEnv._();

  static const _releaseApiBaseUrl =
      'https://suestudy-40910896851.europe-west9.run.app';

  static String get apiBaseUrl {
    final configuredUrl = dotenv.env['API_BASE_URL']?.trim();
    final resolvedUrl =
        configuredUrl?.isNotEmpty == true ? configuredUrl! : _releaseApiBaseUrl;

    return resolvedUrl.endsWith('/')
        ? resolvedUrl.substring(0, resolvedUrl.length - 1)
        : resolvedUrl;
  }
}
