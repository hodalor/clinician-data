import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/models/remote_record_summary.dart';
import '../../dashboard/providers/dashboard_providers.dart';
import '../providers/qc_providers.dart';

class QcCompareRouteArgs {
  const QcCompareRouteArgs({
    required this.recordId,
    required this.correctedValues,
  });

  final String recordId;
  final Map<String, dynamic> correctedValues;
}

class QcCompareScreen extends ConsumerStatefulWidget {
  const QcCompareScreen({
    super.key,
    required this.args,
  });

  final QcCompareRouteArgs args;

  @override
  ConsumerState<QcCompareScreen> createState() => _QcCompareScreenState();
}

class _QcCompareScreenState extends ConsumerState<QcCompareScreen> {
  bool _isResolving = false;

  @override
  Widget build(BuildContext context) {
    final comparisonAsync = ref.watch(
      _qcComparisonProvider(widget.args.recordId),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('QC Comparison'),
      ),
      body: comparisonAsync.when(
        data: (comparison) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: _MetricColumn(
                        label: 'Agreement',
                        value: '${comparison.agreementPct.toStringAsFixed(1)}%',
                      ),
                    ),
                    Expanded(
                      child: _MetricColumn(
                        label: 'Differences',
                        value: '${comparison.discrepancies.length}',
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            ...comparison.comparisons.map(
              (row) => Card(
                color: row.matches ? null : const Color(0xFFFFF3E0),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        row.field,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text('RA: ${row.raValue ?? 'Not entered'}'),
                      const SizedBox(height: 4),
                      Text('QC: ${row.qcValue ?? 'Not entered'}'),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            _ActionButtons(
              busy: _isResolving,
              onApprove: () => _resolve(context, action: 'approve'),
              onCorrect: () => _resolve(
                context,
                action: 'correct',
                correctedValues: widget.args.correctedValues,
              ),
              onReturnToRa: () => _askForReasonAndResolve(
                context,
                action: 'return-to-RA',
              ),
              onVerifyAndLock: () => _resolve(
                context,
                action: 'verify-and-lock',
              ),
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('Could not load QC comparison: $error'),
          ),
        ),
      ),
    );
  }

  Future<void> _askForReasonAndResolve(
    BuildContext context, {
    required String action,
  }) async {
    final controller = TextEditingController();
    await showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Return to RA'),
          content: TextField(
            controller: controller,
            minLines: 3,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: 'Explain what needs correction',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                Navigator.of(context).pop();
                await _resolve(
                  context,
                  action: action,
                  reason: controller.text.trim(),
                  qcComment: controller.text.trim(),
                );
              },
              child: const Text('Send back'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _resolve(
    BuildContext context, {
    required String action,
    Map<String, dynamic>? correctedValues,
    String? reason,
    String? qcComment,
  }) async {
    setState(() {
      _isResolving = true;
    });

    try {
      await ref.read(recordsRepositoryProvider).resolveQc(
            recordId: widget.args.recordId,
            action: action,
            correctedValues: correctedValues,
            reason: reason,
            qcComment: qcComment,
          );
      ref.invalidate(qcAssignedRecordsProvider);
      ref.invalidate(remoteRecordListProvider);
      if (!context.mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('QC action saved.')),
      );
      Navigator.of(context).popUntil((route) => route.isFirst);
    } finally {
      if (mounted) {
        setState(() {
          _isResolving = false;
        });
      }
    }
  }
}

final _qcComparisonProvider =
    FutureProvider.family<QcComparisonResult, String>((ref, recordId) async {
  return ref.watch(recordsRepositoryProvider).getQcComparison(recordId);
});

class _MetricColumn extends StatelessWidget {
  const _MetricColumn({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 6),
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
      ],
    );
  }
}

class _ActionButtons extends StatelessWidget {
  const _ActionButtons({
    required this.busy,
    required this.onApprove,
    required this.onCorrect,
    required this.onReturnToRa,
    required this.onVerifyAndLock,
  });

  final bool busy;
  final VoidCallback onApprove;
  final VoidCallback onCorrect;
  final VoidCallback onReturnToRa;
  final VoidCallback onVerifyAndLock;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        FilledButton(
          onPressed: busy ? null : onApprove,
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
          ),
          child: const Text('Approve'),
        ),
        const SizedBox(height: 8),
        OutlinedButton(
          onPressed: busy ? null : onCorrect,
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
          ),
          child: const Text('Correct using QC entry'),
        ),
        const SizedBox(height: 8),
        OutlinedButton(
          onPressed: busy ? null : onReturnToRa,
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
          ),
          child: const Text('Return to RA'),
        ),
        const SizedBox(height: 8),
        OutlinedButton(
          onPressed: busy ? null : onVerifyAndLock,
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
          ),
          child: const Text('Verify and lock'),
        ),
      ],
    );
  }
}
