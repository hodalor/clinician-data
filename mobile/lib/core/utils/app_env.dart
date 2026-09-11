import 'package:flutter_dotenv/flutter_dotenv.dart';

final class AppEnv {
  const AppEnv._();

  static String get apiBaseUrl =>
      dotenv.env['API_BASE_URL']?.trim().isNotEmpty == true
          ? dotenv.env['API_BASE_URL']!.trim()
          : 'http://10.0.2.2:3000';
}
