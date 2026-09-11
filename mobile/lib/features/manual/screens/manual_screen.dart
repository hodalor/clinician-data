import 'package:flutter/material.dart';

class ManualScreen extends StatelessWidget {
  const ManualScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Manual'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'A simple guide for where to go and what to do next.',
            style: theme.textTheme.bodyLarge,
          ),
          const SizedBox(height: 16),
          _SectionCard(
            title: 'Mobile app: research assistant',
            steps: const [
              'Open Home and look at the queue chips first.',
              'Tap + New abstraction to start a new record.',
              'Use Next and Back to move one section at a time.',
              'Finish on Review & Save before leaving the record.',
              'Use Pending Sync, Sync Failed, and Returned by QC to know what needs action.',
              'Tap Sync now when you want to send records to the server.',
            ],
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Mobile app: QC reviewer',
            steps: const [
              'Open QC Queue.',
              'Tap a record and complete the blind QC entry first.',
              'After submit, read the comparison screen carefully.',
              'Choose Approve, Correct, Return to RA, or Verify and lock.',
            ],
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Mobile app: PI or admin',
            steps: const [
              'Open the overview screen to see totals and recent records.',
              'Check the By RA section to see who still has work remaining.',
              'Use the admin web app for detailed management and exports.',
            ],
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Admin web app: where to find tasks',
            steps: const [
              'Dashboard: overall study progress and by-RA progress.',
              'Assignments: create work batches and review records under each batch.',
              'Records: search and read full record details and audit history.',
              'QC and Duplicates: review disagreements and duplicate flags.',
              'Missingness: see where source data is incomplete.',
              'Export: download spreadsheet tables for approved research work.',
              'Users and Devices: manage accounts and device access.',
            ],
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Simple rules',
            steps: const [
              'Start from the queue instead of relying on memory.',
              'Use Review & Save before leaving a record.',
              'Use Sync status when a record does not appear on the server.',
              'Use Export only for approved study work.',
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.steps,
  });

  final String title;
  final List<String> steps;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            for (var index = 0; index < steps.length; index++) ...[
              Text('${index + 1}. ${steps[index]}'),
              if (index != steps.length - 1) const SizedBox(height: 8),
            ],
          ],
        ),
      ),
    );
  }
}
