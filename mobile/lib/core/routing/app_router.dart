import 'package:flutter/material.dart';
import '../../features/abstraction/screens/ra_wizard_screen.dart';
import '../../features/manual/screens/manual_screen.dart';
import '../../features/qc/screens/qc_compare_screen.dart';
import '../../features/sync/screens/sync_status_screen.dart';

final class AppRouter {
  const AppRouter._();

  static const wizardRoute = '/wizard';
  static const syncStatusRoute = '/sync-status';
  static const qcCompareRoute = '/qc-compare';
  static const manualRoute = '/manual';

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case wizardRoute:
        final args = settings.arguments as AbstractionWizardRouteArgs? ??
            const AbstractionWizardRouteArgs.ra();
        return MaterialPageRoute<void>(
          builder: (_) => RaWizardScreen(
            recordId: args.recordId,
            mode: args.mode,
            remoteRecordId: args.remoteRecordId,
          ),
          settings: settings,
        );
      case syncStatusRoute:
        return MaterialPageRoute<void>(
          builder: (_) => const SyncStatusScreen(),
          settings: settings,
        );
      case qcCompareRoute:
        final args = settings.arguments as QcCompareRouteArgs;
        return MaterialPageRoute<void>(
          builder: (_) => QcCompareScreen(args: args),
          settings: settings,
        );
      case manualRoute:
        return MaterialPageRoute<void>(
          builder: (_) => const ManualScreen(),
          settings: settings,
        );
      default:
        return MaterialPageRoute<void>(
          builder: (_) => const SizedBox.shrink(),
          settings: settings,
        );
    }
  }
}
