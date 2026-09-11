import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/providers/auth_providers.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/session_unlock_screen.dart';
import '../../features/dashboard/screens/dashboard_screen.dart';
import '../../features/sync/providers/sync_providers.dart';

class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key});

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      ref.read(authControllerProvider.notifier).lockForReentry();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    if (authState.session?.user.role == 'RA') {
      ref.watch(syncManagerProvider);
    }

    switch (authState.phase) {
      case AuthPhase.bootstrapping:
        return const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        );
      case AuthPhase.loggedOut:
        return const LoginScreen();
      case AuthPhase.locked:
        return const SessionUnlockScreen();
      case AuthPhase.authenticated:
        return const DashboardScreen();
    }
  }
}
