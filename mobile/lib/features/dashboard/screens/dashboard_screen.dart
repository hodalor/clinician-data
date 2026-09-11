import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/routing/app_router.dart';
import '../../../data/local/app_database.dart';
import '../../abstraction/screens/ra_wizard_screen.dart';
import '../../abstraction/providers/abstraction_providers.dart';
import '../../auth/providers/auth_providers.dart';
import '../../dashboard/providers/dashboard_providers.dart';
import '../../qc/providers/qc_providers.dart';
import '../../sync/providers/sync_providers.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  String _selectedQueue = 'All';

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final user = authState.session?.user;

    switch (user?.role) {
      case 'QC':
        return _QcDashboard(userName: user?.fullName ?? 'QC Reviewer');
      case 'PI':
      case 'ADMIN':
      case 'SUPERADMIN':
        return _PiAdminDashboard(
          role: user?.role ?? '',
          userName: user?.fullName ?? 'User',
        );
      case 'RA':
      default:
        return _RaDashboard(
          userName: user?.fullName ?? 'RA User',
          selectedQueue: _selectedQueue,
          onQueueSelected: (value) {
            setState(() {
              _selectedQueue = value;
            });
          },
        );
    }
  }
}

class _RaDashboard extends ConsumerWidget {
  const _RaDashboard({
    required this.userName,
    required this.selectedQueue,
    required this.onQueueSelected,
  });

  final String userName;
  final String selectedQueue;
  final ValueChanged<String> onQueueSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(raDashboardSummaryProvider);
    final recordsAsync = ref.watch(localRecordListProvider);
    final activeAssignmentAsync = ref.watch(activeAssignmentProvider);
    final syncState = ref.watch(syncManagerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            onPressed: () =>
                Navigator.of(context).pushNamed(AppRouter.manualRoute),
            icon: const Icon(Icons.menu_book),
            tooltip: 'Manual',
          ),
          TextButton(
            onPressed: syncState.isSyncing
                ? null
                : () => ref.read(syncManagerProvider.notifier).syncNow(),
            child: const Text('Sync now'),
          ),
          IconButton(
            onPressed: () =>
                Navigator.of(context).pushNamed(AppRouter.syncStatusRoute),
            icon: const Icon(Icons.sync),
            tooltip: 'Sync status',
          ),
          IconButton(
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
          ),
        ],
      ),
      floatingActionButton: activeAssignmentAsync.maybeWhen(
        data: (assignment) => FloatingActionButton(
          onPressed: assignment?.hasActiveAssignment == true
              ? () => Navigator.of(context).pushNamed(
                    AppRouter.wizardRoute,
                    arguments: const AbstractionWizardRouteArgs.ra(),
                  )
              : null,
          child: const Icon(Icons.add),
        ),
        orElse: () => FloatingActionButton(
          onPressed: null,
          child: const Icon(Icons.add),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            userName,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 4),
          activeAssignmentAsync.when(
            data: (assignment) {
              if (assignment?.hasActiveAssignment != true ||
                  assignment?.assignment == null) {
                return const Text('No active assignment right now.');
              }
              final detail = assignment!.assignment!;
              return Text(
                'Active assignment: ${detail.from.day}/${detail.from.month} - ${detail.to.day}/${detail.to.month}',
                style: Theme.of(context).textTheme.bodyMedium,
              );
            },
            loading: () => const Text('Checking assignment...'),
            error: (_, __) => const Text('Could not load assignment status.'),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 18,
            runSpacing: 12,
            children: [
              _PlainMetric(label: 'Assigned', value: '${summary.assigned}'),
              _PlainMetric(label: 'Completed', value: '${summary.completed}'),
              _PlainMetric(label: 'Remaining', value: '${summary.remaining}'),
              _PlainMetric(label: 'Synced', value: '${summary.synced}'),
              _PlainMetric(
                label: 'Pending Sync',
                value: '${summary.pendingSync}',
              ),
              _PlainMetric(
                label: 'Returned by QC',
                value: '${summary.returnedByQc}',
              ),
            ],
          ),
          const SizedBox(height: 18),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final queue in const [
                  'All',
                  'Drafts',
                  'Pending Outcome',
                  'Pending Sync',
                  'Sync Failed',
                  'Returned by QC',
                ])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(queue),
                      selected: selectedQueue == queue,
                      onSelected: (_) => onQueueSelected(queue),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          recordsAsync.when(
            data: (records) => _RaRecordList(
              records: _filterQueue(records, selectedQueue),
              selectedQueue: selectedQueue,
            ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => Text('Could not load records: $error'),
          ),
        ],
      ),
    );
  }

  List<ResearchRecord> _filterQueue(
    List<ResearchRecord> records,
    String selectedQueue,
  ) {
    switch (selectedQueue) {
      case 'Drafts':
        return records.where((record) => record.status == 'Draft').toList();
      case 'Pending Outcome':
        return records
            .where(
              (record) =>
                  record.status == 'Clinical Data Complete - Outcome Pending',
            )
            .toList();
      case 'Pending Sync':
        return records
            .where((record) => record.syncState == 'pending')
            .toList();
      case 'Sync Failed':
        return records.where((record) => record.syncState == 'failed').toList();
      case 'Returned by QC':
        return records
            .where((record) => record.status == 'Returned for Correction')
            .toList();
      default:
        return records;
    }
  }
}

class _QcDashboard extends ConsumerWidget {
  const _QcDashboard({
    required this.userName,
  });

  final String userName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recordsAsync = ref.watch(qcAssignedRecordsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('QC Queue'),
        actions: [
          IconButton(
            onPressed: () =>
                Navigator.of(context).pushNamed(AppRouter.manualRoute),
            icon: const Icon(Icons.menu_book),
            tooltip: 'Manual',
          ),
          IconButton(
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(userName, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 4),
          const Text('Assigned records for blind re-abstraction'),
          const SizedBox(height: 16),
          recordsAsync.when(
            data: (records) {
              if (records.isEmpty) {
                return const Text('No QC records are assigned right now.');
              }
              return Column(
                children: records
                    .map(
                      (record) => Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          title: Text(record.studyId),
                          subtitle: Text(record.status),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => Navigator.of(context).pushNamed(
                            AppRouter.wizardRoute,
                            arguments: AbstractionWizardRouteArgs.qc(
                              remoteRecordId: record.id,
                            ),
                          ),
                        ),
                      ),
                    )
                    .toList(growable: false),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => Text('Could not load QC queue: $error'),
          ),
        ],
      ),
    );
  }
}

class _PiAdminDashboard extends ConsumerWidget {
  const _PiAdminDashboard({
    required this.role,
    required this.userName,
  });

  final String role;
  final String userName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recordsAsync = ref.watch(remoteRecordListProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('$role Overview'),
        actions: [
          IconButton(
            onPressed: () =>
                Navigator.of(context).pushNamed(AppRouter.manualRoute),
            icon: const Icon(Icons.menu_book),
            tooltip: 'Manual',
          ),
          IconButton(
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: recordsAsync.when(
        data: (records) {
          final byExtractor = <String, int>{};
          var missingness = 0;
          for (final record in records) {
            byExtractor.update(
              record.extractorName ?? record.extractorId ?? 'Unassigned',
              (value) => value + 1,
              ifAbsent: () => 1,
            );
            if ((record.dataQuality['miss_sats'] == true) ||
                (record.dataQuality['miss_tews'] == true) ||
                (record.dataQuality['miss_vitals'] == true) ||
                (record.dataQuality['miss_outcome'] == true)) {
              missingness += 1;
            }
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(userName, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              Wrap(
                spacing: 18,
                runSpacing: 12,
                children: [
                  _PlainMetric(label: 'Records', value: '${records.length}'),
                  _PlainMetric(
                    label: 'Verified',
                    value:
                        '${records.where((record) => record.status == 'Verified').length}',
                  ),
                  _PlainMetric(label: 'Missingness', value: '$missingness'),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                'By RA',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              ...byExtractor.entries.map(
                (entry) => ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(entry.key),
                  trailing: Text('${entry.value}'),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                'Recent records',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              ...records.take(20).map(
                    (record) => ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: Text(record.studyId),
                      subtitle: Text(record.status),
                      trailing: Text(record.extractorName ?? ''),
                    ),
                  ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('Could not load overview: $error'),
          ),
        ),
      ),
    );
  }
}

class _RaRecordList extends ConsumerWidget {
  const _RaRecordList({
    required this.records,
    required this.selectedQueue,
  });

  final List<ResearchRecord> records;
  final String selectedQueue;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (records.isEmpty) {
      return const Text('No records in this queue.');
    }

    final groups = <String, List<ResearchRecord>>{};
    for (final record in records) {
      groups.putIfAbsent(record.status, () => []).add(record);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: groups.entries.map((entry) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                entry.key,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              ...entry.value.map(
                (record) => Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    title: Text(record.studyId),
                    subtitle: Text(_buildSubtitle(record)),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.of(context).pushNamed(
                      AppRouter.wizardRoute,
                      arguments: AbstractionWizardRouteArgs.ra(
                        recordId: record.id,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(growable: false),
    );
  }

  String _buildSubtitle(ResearchRecord record) {
    final syncLabel = switch (record.syncState) {
      'pending' => 'Pending Sync',
      'syncing' => 'Syncing',
      'synced' => 'Synced',
      'failed' => 'Sync Failed',
      'conflict' => 'Needs Review',
      _ => record.syncState,
    };
    return '${record.status} • $syncLabel';
  }
}

class _PlainMetric extends StatelessWidget {
  const _PlainMetric({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return RichText(
      text: TextSpan(
        style: Theme.of(context).textTheme.bodyLarge,
        children: [
          TextSpan(
            text: '$label: ',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          TextSpan(
            text: value,
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ],
      ),
    );
  }
}
