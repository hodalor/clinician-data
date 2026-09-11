import 'package:flutter/material.dart';

final class AppTheme {
  const AppTheme._();

  static ThemeData get light {
    const seed = Color(0xFF8A6A2F);

    return ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: seed),
      useMaterial3: true,
      scaffoldBackgroundColor: const Color(0xFFF6F2EA),
      appBarTheme: const AppBarTheme(centerTitle: false),
    );
  }
}
