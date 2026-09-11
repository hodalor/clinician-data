import 'package:flutter/material.dart';
import 'core/routing/app_shell.dart';
import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';

class SueMobileApp extends StatelessWidget {
  const SueMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SUE Mobile',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      onGenerateRoute: AppRouter.onGenerateRoute,
      home: const AppShell(),
    );
  }
}
