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

const _gold = Color(0xFFC89A3F);
const _ink = Color(0xFF17120D);
const _sand = Color(0xFFF7F1E7);
const _card = Color(0xFFFFFCF6);

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
      backgroundColor: _sand,
      appBar: AppBar(
        title: const Text('Home'),
        backgroundColor: _card,
        surfaceTintColor: Colors.transparent,
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
          backgroundColor: _gold,
          foregroundColor: _ink,
          onPressed: assignment?.hasActiveAssignment == true
              ? () => Navigator.of(context).pushNamed(
                    AppRouter.wizardRoute,
                    arguments: const AbstractionWizardRouteArgs.ra(),
                  )
              : null,
          child: const Icon(Icons.add),
        ),
        orElse: () => FloatingActionButton(
          backgroundColor: const Color(0xFFE0D8CA),
          foregroundColor: const Color(0xFF8A7A60),
          onPressed: null,
          child: const Icon(Icons.add),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [_ink, Color(0xFF3C2D13)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x22000000),
                  blurRadius: 24,
                  offset: Offset(0, 14),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  userName,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Daily abstraction dashboard',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: const Color(0xFFF3E5C6),
                      ),
                ),
                const SizedBox(height: 10),
                activeAssignmentAsync.when(
                  data: (assignment) {
                    if (assignment?.hasActiveAssignment != true ||
                        assignment?.assignment == null) {
                      return Text(
                        'No active assignment right now.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: const Color(0xFFF3E5C6),
                            ),
                      );
                    }
                    final detail = assignment!.assignment!;
                    return Text(
                      'Active assignment: ${detail.from.day}/${detail.from.month} - ${detail.to.day}/${detail.to.month}',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: const Color(0xFFF3E5C6),
                          ),
                    );
                  },
                  loading: () => Text(
                    'Checking assignment...',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: const Color(0xFFF3E5C6),
                        ),
                  ),
                  error: (_, __) => Text(
                    'Could not load assignment status.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: const Color(0xFFF3E5C6),
                        ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _SummaryCard(label: 'Assigned', value: '${summary.assigned}'),
              _SummaryCard(label: 'Completed', value: '${summary.completed}'),
              _SummaryCard(label: 'Remaining', value: '${summary.remaining}'),
              _SummaryCard(label: 'Synced', value: '${summary.synced}'),
              _SummaryCard(
                label: 'Pending Sync',
                value: '${summary.pendingSync}',
              ),
              _SummaryCard(
                label: 'Returned by QC',
                value: '${summary.returnedByQc}',
              ),
            ],
          ),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: _card,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFFE6D7BD)),
            ),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final queue in const [
                  'All',
                  'Drafts',
                  'Pending Outcome',
                  'Pending Sync',
                  'Sync Failed',
                  'Returned by QC',
                ])
                  ChoiceChip(
                    label: Text(queue),
                    selected: selectedQueue == queue,
                    labelStyle: TextStyle(
                      color: selectedQueue == queue ? _ink : const Color(0xFF5E5240),
                      fontWeight: FontWeight.w600,
                    ),
                    selectedColor: const Color(0xFFF0D7A4),
                    backgroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFFD6C4A4)),
                    onSelected: (_) => onQueueSelected(queue),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          recordsAsync.when(
            data: (records) => _RaRecordList(
              records: _filterQueue(records, selectedQueue),
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
                    _SummaryCard(label: 'Records', value: '${records.length}'),
                    _SummaryCard(
                    label: 'Verified',
                    value:
                        '${records.where((record) => record.status == 'Verified').length}',
                  ),
                    _SummaryCard(label: 'Missingness', value: '$missingness'),
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
  });

  final List<ResearchRecord> records;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (records.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: _card,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFE6D7BD)),
        ),
        child: const Text('No records in this queue.'),
      );
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
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _card,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFFE6D7BD)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x11000000),
                  blurRadius: 20,
                  offset: Offset(0, 10),
                ),
              ],
            ),
            child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: const BoxDecoration(
                      color: _gold,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    entry.key,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: _ink,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  columnSpacing: 24,
                  headingTextStyle: Theme.of(context).textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: _ink,
                      ),
                  columns: const [
                    DataColumn(label: Text('Study ID')),
                    DataColumn(label: Text('Status')),
                    DataColumn(label: Text('Sync')),
                    DataColumn(label: Text('Updated')),
                    DataColumn(label: Text('Open')),
                  ],
                  rows: entry.value
                      .map(
                        (record) => DataRow(
                          cells: [
                            DataCell(Text(record.studyId)),
                            DataCell(Text(record.status)),
                            DataCell(Text(_syncLabel(record.syncState))),
                            DataCell(
                              Text(
                                  _formatDateTime(record.updatedAt),
                              ),
                            ),
                            DataCell(
                              OutlinedButton(
                                onPressed: () => Navigator.of(context).pushNamed(
                                  AppRouter.wizardRoute,
                                  arguments: AbstractionWizardRouteArgs.ra(
                                    recordId: record.id,
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: _gold,
                                  side: const BorderSide(color: _gold),
                                ),
                                child: const Text('Open'),
                              ),
                            ),
                          ],
                        ),
                      )
                      .toList(growable: false),
                ),
              ),
            ],
          ),
          ),
        );
      }).toList(growable: false),
    );
  }

  String _syncLabel(String value) => switch (value) {
        'pending' => 'Pending Sync',
        'syncing' => 'Syncing',
        'synced' => 'Synced',
        'failed' => 'Sync Failed',
        'conflict' => 'Needs Review',
        _ => value,
      };

  String _formatDateTime(DateTime value) {
    final hour = value.hour.toString().padLeft(2, '0');
    final minute = value.minute.toString().padLeft(2, '0');
    return '${value.day}/${value.month}/${value.year} $hour:$minute';
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 150,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _card,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE6D7BD)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: const Color(0xFF7D6842),
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: _ink,
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}
