import 'package:flutter/material.dart';
import 'core/routing/app_shell.dart';
import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';

class SeuMobileApp extends StatelessWidget {
  const SeuMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SEU Mobile',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      onGenerateRoute: AppRouter.onGenerateRoute,
      home: const AppShell(),
    );
  }
}
