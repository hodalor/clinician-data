import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/routing/app_router.dart';
import '../../../data/local/app_database.dart';
import '../../../data/models/active_assignment.dart';
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
  int _selectedRaTab = 0;

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
          selectedTab: _selectedRaTab,
          onQueueSelected: (value) {
            setState(() {
              _selectedQueue = value;
            });
          },
          onTabSelected: (value) {
            setState(() {
              _selectedRaTab = value;
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
    required this.selectedTab,
    required this.onQueueSelected,
    required this.onTabSelected,
  });

  final String userName;
  final String selectedQueue;
  final int selectedTab;
  final ValueChanged<String> onQueueSelected;
  final ValueChanged<int> onTabSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(raDashboardSummaryProvider);
    final recordsAsync = ref.watch(localRecordListProvider);
    final activeAssignmentAsync = ref.watch(activeAssignmentProvider);
    final syncState = ref.watch(syncManagerProvider);
    final canCreate = activeAssignmentAsync.maybeWhen(
      data: (assignment) => assignment?.hasActiveAssignment == true,
      orElse: () => false,
    );

    return Scaffold(
      backgroundColor: _sand,
      appBar: AppBar(
        title: Text(
          switch (selectedTab) {
            1 => 'Records',
            2 => 'Profile',
            _ => 'Home',
          },
        ),
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
          onPressed: selectedTab == 2
              ? null
              : assignment?.hasActiveAssignment == true
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
      body: SafeArea(
        child: IndexedStack(
          index: selectedTab,
          children: [
            _RaHomeTab(
              userName: userName,
              summary: summary,
              activeAssignmentAsync: activeAssignmentAsync,
              recordsAsync: recordsAsync,
              canCreate: canCreate,
            ),
            _RaRecordsTab(
              selectedQueue: selectedQueue,
              onQueueSelected: onQueueSelected,
              recordsAsync: recordsAsync,
              canCreate: canCreate,
            ),
            _RaProfileTab(
              userName: userName,
              activeAssignmentAsync: activeAssignmentAsync,
            ),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedTab,
        onDestinationSelected: onTabSelected,
        backgroundColor: _card,
        indicatorColor: const Color(0xFFF0D7A4),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: _BottomNavIconWithBadge(
              count: summary.assigned,
              icon: Icons.table_chart_outlined,
            ),
            selectedIcon: _BottomNavIconWithBadge(
              count: summary.assigned,
              icon: Icons.table_chart,
            ),
            label: 'Records',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
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

class _RaHomeTab extends StatelessWidget {
  const _RaHomeTab({
    required this.userName,
    required this.summary,
    required this.activeAssignmentAsync,
    required this.recordsAsync,
    required this.canCreate,
  });

  final String userName;
  final DashboardSummary summary;
  final AsyncValue<ActiveAssignment?> activeAssignmentAsync;
  final AsyncValue<List<ResearchRecord>> recordsAsync;
  final bool canCreate;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [_ink, Color(0xFF3C2D13)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(22),
            boxShadow: const [
              BoxShadow(
                color: Color(0x22000000),
                blurRadius: 18,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: const Color(0xFFF4E8CB),
                child: Text(
                  userName.isNotEmpty ? userName[0].toUpperCase() : 'R',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: _ink,
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      userName,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      canCreate
                          ? 'Ready to capture new abstractions'
                          : 'Waiting for an active assignment',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: const Color(0xFFF3E5C6),
                            fontSize: 13,
                          ),
                    ),
                    const SizedBox(height: 6),
                    activeAssignmentAsync.when(
                      data: (assignment) {
                        if (assignment?.hasActiveAssignment != true ||
                            assignment?.assignment == null) {
                          return Text(
                            'No active assignment right now.',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: const Color(0xFFF3E5C6),
                                ),
                          );
                        }
                        final detail = assignment!.assignment!;
                        return Text(
                          'Assignment: ${detail.from.day}/${detail.from.month} - ${detail.to.day}/${detail.to.month}',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: const Color(0xFFF3E5C6),
                              ),
                        );
                      },
                      loading: () => Text(
                        'Checking assignment...',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: const Color(0xFFF3E5C6),
                            ),
                      ),
                      error: (_, __) => Text(
                        'Could not load assignment.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: const Color(0xFFF3E5C6),
                            ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 12,
          runSpacing: 12,
          children: [
            _SummaryCard(label: 'Assigned', value: '${summary.assigned}'),
            _SummaryCard(label: 'Completed', value: '${summary.completed}'),
            _SummaryCard(label: 'Remaining', value: '${summary.remaining}'),
            _SummaryCard(label: 'Synced', value: '${summary.synced}'),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _card,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: const Color(0xFFE6D7BD)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Recent records',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: _ink,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 10),
              recordsAsync.when(
                data: (records) {
                  if (records.isEmpty) {
                    return const Text('No records yet.');
                  }
                  return SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: DataTable(
                      columnSpacing: 20,
                      columns: const [
                        DataColumn(label: Text('Study ID')),
                        DataColumn(label: Text('Status')),
                        DataColumn(label: Text('Sync')),
                      ],
                      rows: records
                          .take(5)
                          .map(
                            (record) => DataRow(
                              cells: [
                                DataCell(Text(record.studyId)),
                                DataCell(Text(record.status)),
                                DataCell(Text(_syncLabel(record.syncState))),
                              ],
                            ),
                          )
                          .toList(growable: false),
                    ),
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Text('Could not load records: $error'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _RaRecordsTab extends StatelessWidget {
  const _RaRecordsTab({
    required this.selectedQueue,
    required this.onQueueSelected,
    required this.recordsAsync,
    required this.canCreate,
  });

  final String selectedQueue;
  final ValueChanged<String> onQueueSelected;
  final AsyncValue<List<ResearchRecord>> recordsAsync;
  final bool canCreate;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Records',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: _ink,
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 6),
        Text(
          'Choose a queue to open the table view.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF6B5A3E),
              ),
        ),
        const SizedBox(height: 16),
        recordsAsync.when(
          data: (records) {
            final queueCards = _buildQueueCards(records);

            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.24,
              ),
              itemCount: queueCards.length,
              itemBuilder: (context, index) {
                final item = queueCards[index];
                return _QueueMenuCard(
                  icon: item.icon,
                  label: item.label,
                  count: item.records.length,
                  isSelected: selectedQueue == item.label,
                  onTap: () {
                    onQueueSelected(item.label);
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => _QueueTableScreen(
                          title: item.label,
                          records: item.records,
                          canCreate: canCreate,
                        ),
                      ),
                    );
                  },
                );
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Text('Could not load records: $error'),
        ),
      ],
    );
  }
}

class _RaProfileTab extends ConsumerWidget {
  const _RaProfileTab({
    required this.userName,
    required this.activeAssignmentAsync,
  });

  final String userName;
  final AsyncValue<ActiveAssignment?> activeAssignmentAsync;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).session?.user;
    final summary = ref.watch(raDashboardSummaryProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: _card,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: const Color(0xFFE6D7BD)),
          ),
          child: Column(
            children: [
              CircleAvatar(
                radius: 34,
                backgroundColor: const Color(0xFFF0D7A4),
                child: Text(
                  userName.isNotEmpty ? userName[0].toUpperCase() : 'R',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: _ink,
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                user?.fullName ?? userName,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: _ink,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                user?.email ?? 'No email',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF6B5A3E),
                    ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _ProfileInfoCard(
          title: 'Profile',
          rows: [
            _ProfileRow(label: 'Role', value: user?.role ?? 'RA'),
            _ProfileRow(label: 'Name', value: user?.fullName ?? userName),
            _ProfileRow(label: 'Email', value: user?.email ?? 'No email'),
          ],
        ),
        const SizedBox(height: 16),
        _ProfileInfoCard(
          title: 'Work summary',
          rows: [
            _ProfileRow(label: 'Assigned records', value: '${summary.assigned}'),
            _ProfileRow(label: 'Completed', value: '${summary.completed}'),
            _ProfileRow(label: 'Pending sync', value: '${summary.pendingSync}'),
            _ProfileRow(label: 'Returned by QC', value: '${summary.returnedByQc}'),
          ],
        ),
        const SizedBox(height: 16),
        _ProfileInfoCard(
          title: 'Assignment',
          rows: [
            _ProfileRow(
              label: 'Status',
              value: activeAssignmentAsync.maybeWhen(
                data: (assignment) =>
                    assignment?.hasActiveAssignment == true ? 'Active' : 'No active assignment',
                orElse: () => 'Checking',
              ),
            ),
            _ProfileRow(
              label: 'Window',
              value: activeAssignmentAsync.maybeWhen(
                data: (assignment) {
                  final detail = assignment?.assignment;
                  if (detail == null) {
                    return 'Not available';
                  }
                  return '${detail.from.day}/${detail.from.month} - ${detail.to.day}/${detail.to.month}';
                },
                orElse: () => 'Checking',
              ),
            ),
          ],
        ),
      ],
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

class _QueueMenuCard extends StatelessWidget {
  const _QueueMenuCard({
    required this.icon,
    required this.label,
    required this.count,
    required this.isSelected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final int count;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFF7E7BF) : _card,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: isSelected ? _gold : const Color(0xFFE6D7BD),
            ),
          ),
          child: Stack(
            children: [
              Padding(
                padding: const EdgeInsets.all(13),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(icon, color: _gold, size: 22),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      label,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: _ink,
                            fontSize: 17,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      count == 1 ? '1 record' : '$count records',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: const Color(0xFF6B5A3E),
                          ),
                    ),
                  ],
                ),
              ),
              if (count > 0)
                Positioned(
                  top: 10,
                  right: 10,
                  child: _CountBadge(count: count),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BottomNavIconWithBadge extends StatelessWidget {
  const _BottomNavIconWithBadge({
    required this.count,
    required this.icon,
  });

  final int count;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(icon),
        if (count > 0)
          Positioned(
            top: -8,
            right: -12,
            child: _CountBadge(count: count, compact: true),
          ),
      ],
    );
  }
}

class _CountBadge extends StatelessWidget {
  const _CountBadge({
    required this.count,
    this.compact = false,
  });

  final int count;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final display = count > 99 ? '99+' : '$count';
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 5 : 7,
        vertical: compact ? 2 : 4,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFFD64545),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        display,
        style: TextStyle(
          color: Colors.white,
          fontSize: compact ? 10 : 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _QueueTableScreen extends StatelessWidget {
  const _QueueTableScreen({
    required this.title,
    required this.records,
    required this.canCreate,
  });

  final String title;
  final List<ResearchRecord> records;
  final bool canCreate;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _sand,
      appBar: AppBar(
        title: Text(title),
        backgroundColor: _card,
        surfaceTintColor: Colors.transparent,
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: canCreate ? _gold : const Color(0xFFE0D8CA),
        foregroundColor: canCreate ? _ink : const Color(0xFF8A7A60),
        onPressed: canCreate
            ? () => Navigator.of(context).pushNamed(
                  AppRouter.wizardRoute,
                  arguments: const AbstractionWizardRouteArgs.ra(),
                )
            : null,
        child: const Icon(Icons.add),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _card,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFFE6D7BD)),
            ),
            child: records.isEmpty
                ? const Text('No records in this queue.')
                : LayoutBuilder(
                    builder: (context, constraints) {
                      return SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: ConstrainedBox(
                          constraints: BoxConstraints(
                            minWidth: constraints.maxWidth < 720
                                ? 720
                                : constraints.maxWidth,
                          ),
                          child: DataTable(
                            showCheckboxColumn: false,
                            columnSpacing: 24,
                            columns: const [
                              DataColumn(label: Text('Study ID')),
                              DataColumn(label: Text('Status')),
                              DataColumn(label: Text('Sync')),
                              DataColumn(label: Text('Updated')),
                            ],
                            rows: records
                                .map(
                                  (record) => DataRow(
                                    onSelectChanged: (_) => Navigator.of(context)
                                        .pushNamed(
                                      AppRouter.wizardRoute,
                                      arguments: AbstractionWizardRouteArgs.ra(
                                        recordId: record.id,
                                      ),
                                    ),
                                    cells: [
                                      DataCell(Text(record.studyId)),
                                      DataCell(Text(record.status)),
                                      DataCell(Text(_syncLabel(record.syncState))),
                                      DataCell(Text(_formatDateTime(record.updatedAt))),
                                    ],
                                  ),
                                )
                                .toList(growable: false),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _ProfileInfoCard extends StatelessWidget {
  const _ProfileInfoCard({
    required this.title,
    required this.rows,
  });

  final String title;
  final List<_ProfileRow> rows;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _card,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE6D7BD)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: _ink,
                ),
          ),
          const SizedBox(height: 12),
          ...rows.map(
            (row) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      row.label,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: const Color(0xFF7D6842),
                          ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      row.value,
                      textAlign: TextAlign.right,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: _ink,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileRow {
  const _ProfileRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;
}

class _QueueMenuItem {
  const _QueueMenuItem({
    required this.label,
    required this.icon,
    required this.records,
  });

  final String label;
  final IconData icon;
  final List<ResearchRecord> records;
}

List<_QueueMenuItem> _buildQueueCards(List<ResearchRecord> records) {
  return [
    _QueueMenuItem(
      label: 'All',
      icon: Icons.grid_view_rounded,
      records: _filterQueue(records, 'All'),
    ),
    _QueueMenuItem(
      label: 'Drafts',
      icon: Icons.edit_note_rounded,
      records: _filterQueue(records, 'Drafts'),
    ),
    _QueueMenuItem(
      label: 'Pending Outcome',
      icon: Icons.hourglass_top_rounded,
      records: _filterQueue(records, 'Pending Outcome'),
    ),
    _QueueMenuItem(
      label: 'Pending Sync',
      icon: Icons.cloud_upload_outlined,
      records: _filterQueue(records, 'Pending Sync'),
    ),
    _QueueMenuItem(
      label: 'Sync Failed',
      icon: Icons.error_outline_rounded,
      records: _filterQueue(records, 'Sync Failed'),
    ),
    _QueueMenuItem(
      label: 'Returned by QC',
      icon: Icons.assignment_returned_outlined,
      records: _filterQueue(records, 'Returned by QC'),
    ),
  ];
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
      return records.where((record) => record.syncState == 'pending').toList();
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
      width: 138,
      padding: const EdgeInsets.all(14),
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
                  fontSize: 32,
                ),
          ),
        ],
      ),
    );
  }
}
