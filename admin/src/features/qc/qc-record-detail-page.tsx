import {
  Alert,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getQcComparison,
  getQcReviewSession,
  resolveQcRecord,
  unassignQcRecord,
} from '../../api/qc-api';
import {
  formatRecordFieldLabel,
  formatRecordValue,
} from '../records/record-decoders';

export function QcRecordDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { recordId } = useParams();
  const [returnModalOpen, returnModalHandlers] = useDisclosure(false);
  const [correctModalOpen, correctModalHandlers] = useDisclosure(false);
  const [unassignModalOpen, unassignModalHandlers] = useDisclosure(false);
  const [returnComment, setReturnComment] = useState('');
  const [correctComment, setCorrectComment] = useState('');

  const sessionQuery = useQuery({
    queryKey: ['qc-session', recordId],
    queryFn: () => getQcReviewSession(recordId!),
    enabled: Boolean(recordId),
  });
  const reabstractionSubmitted = sessionQuery.data?.reabstraction_submitted === true;
  const comparisonQuery = useQuery({
    queryKey: ['qc-compare', recordId],
    queryFn: () => getQcComparison(recordId!),
    enabled: Boolean(recordId),
  });

  const correctedValues = useMemo(() => {
    const output: Record<string, unknown> = {};
    for (const row of comparisonQuery.data?.comparisons ?? []) {
      if (row.qc_value !== undefined && row.qc_value !== null) {
        setNestedValue(output, row.field, row.qc_value);
      }
    }
    return output;
  }, [comparisonQuery.data?.comparisons]);

  const unassignMutation = useMutation({
    mutationFn: () => unassignQcRecord(recordId!),
    onSuccess: async (result) => {
      notifications.show({
        color: 'green',
        title: 'QC assignment removed',
        message: `The record is back to ${result.status}.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['qc-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['records'] }),
        queryClient.invalidateQueries({ queryKey: ['qc-session', recordId] }),
        queryClient.invalidateQueries({ queryKey: ['qc-compare', recordId] }),
      ]);
      navigate('/qc');
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Could not unassign QC',
        message: error.message,
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (payload: {
      action: 'approve' | 'correct' | 'return-to-RA' | 'verify-and-lock';
      corrected_values?: Record<string, unknown>;
      reason?: string;
      qc_comment?: string;
    }) => resolveQcRecord(recordId!, payload),
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: 'QC action saved',
        message: 'The record has been updated.',
      });
      returnModalHandlers.close();
      correctModalHandlers.close();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['qc-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['qc-compare', recordId] }),
        queryClient.invalidateQueries({ queryKey: ['qc-session', recordId] }),
      ]);
      navigate('/qc');
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Could not save QC action',
        message: error.message,
      });
    },
  });

  if (sessionQuery.isLoading) {
    return <Text c="dimmed">Loading QC review...</Text>;
  }

  if (sessionQuery.error || comparisonQuery.error) {
    return (
      <Alert color="red" title="Could not load QC record">
        {sessionQuery.error?.message ?? comparisonQuery.error?.message}
      </Alert>
    );
  }

  const session = sessionQuery.data;
  const comparison = comparisonQuery.data;
  const canUnassign = session?.record_status === 'QC Required';

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="lg">
        <Stack gap={4}>
          <Title order={2}>QC record detail</Title>
          <Text c="dimmed">
            {reabstractionSubmitted
              ? 'Review the original abstraction against the submitted QC re-abstraction and choose the next action.'
              : 'QC has not submitted a re-abstraction yet. The QC column stays empty until the form is submitted.'}
          </Text>
        </Stack>
        <Group gap="xl" mt="md">
          <Text size="sm">
            <strong>Study ID:</strong> {session?.study_id ?? 'Not available'}
          </Text>
          <Text size="sm">
            <strong>Status:</strong> {session?.record_status ?? 'Loading...'}
          </Text>
          <Text size="sm">
            <strong>Agreement:</strong>{' '}
            {comparison ? `${comparison.agreement_pct}%` : 'Loading...'}
          </Text>
        </Group>
      </Paper>

      <Paper withBorder radius="md" p="lg">
        <Table withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Field</Table.Th>
              <Table.Th>RA said</Table.Th>
              <Table.Th>QC said</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(comparison?.comparisons ?? []).map((row) => (
              <Table.Tr key={row.field} bg={row.matches ? undefined : 'red.0'}>
                <Table.Td>{formatRecordFieldLabel(row.field)}</Table.Td>
                <Table.Td c={row.matches ? undefined : 'red'}>
                  {formatRecordValue(row.field, row.ra_value)}
                </Table.Td>
                <Table.Td c={row.matches ? undefined : 'red'}>
                  {formatRecordValue(row.field, row.qc_value)}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Group>
        <Button component={Link} to={`/qc/${recordId}/form`} color="yellow">
          Open QC form
        </Button>
        {canUnassign ? (
          <Button variant="outline" color="red" onClick={unassignModalHandlers.open}>
            Unassign QC
          </Button>
        ) : null}
        <Button
          onClick={() => resolveMutation.mutate({ action: 'approve' })}
          loading={resolveMutation.isPending}
          disabled={!reabstractionSubmitted}
        >
          Approve
        </Button>
        <Button
          variant="outline"
          onClick={correctModalHandlers.open}
          loading={resolveMutation.isPending}
          disabled={!reabstractionSubmitted}
        >
          Correct
        </Button>
        <Button
          variant="outline"
          color="orange"
          onClick={returnModalHandlers.open}
          loading={resolveMutation.isPending}
          disabled={!reabstractionSubmitted}
        >
          Return to RA
        </Button>
        <Button
          variant="outline"
          onClick={() => resolveMutation.mutate({ action: 'verify-and-lock' })}
          loading={resolveMutation.isPending}
          disabled={!reabstractionSubmitted}
        >
          Verify and lock
        </Button>
      </Group>

      <Modal opened={unassignModalOpen} onClose={unassignModalHandlers.close} title="Unassign QC">
        <Stack>
          <Text size="sm">
            Remove this QC assignment and return the record to the status it had before it was
            sent to QC.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={unassignModalHandlers.close}>
              Cancel
            </Button>
            <Button
              color="red"
              loading={unassignMutation.isPending}
              onClick={() => unassignMutation.mutate()}
            >
              Unassign
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={correctModalOpen}
        onClose={correctModalHandlers.close}
        title="Correct record"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            The QC entry will replace the original values. Leave a note explaining what was wrong.
          </Text>
          <Textarea
            label="Remarks"
            placeholder="Explain the correction"
            minRows={4}
            value={correctComment}
            onChange={(event) => setCorrectComment(event.currentTarget.value)}
          />
          <Button
            disabled={correctComment.trim().length === 0}
            loading={resolveMutation.isPending}
            onClick={() =>
              resolveMutation.mutate({
                action: 'correct',
                corrected_values: correctedValues,
                qc_comment: correctComment.trim(),
              })
            }
          >
            Save correction
          </Button>
        </Stack>
      </Modal>

      <Modal opened={returnModalOpen} onClose={returnModalHandlers.close} title="Return to RA">
        <Stack>
          <Text size="sm" c="dimmed">
            Tell the research assistant what needs to be fixed before this record can continue.
          </Text>
          <Textarea
            label="Remarks"
            placeholder="Explain what needs correction"
            minRows={4}
            value={returnComment}
            onChange={(event) => setReturnComment(event.currentTarget.value)}
          />
          <Button
            disabled={returnComment.trim().length === 0}
            loading={resolveMutation.isPending}
            onClick={() =>
              resolveMutation.mutate({
                action: 'return-to-RA',
                reason: returnComment.trim(),
                qc_comment: returnComment.trim(),
              })
            }
          >
            Send back
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}

function setNestedValue(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  let current: Record<string, unknown> = target;

  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value;
      return;
    }

    const nextValue = current[part];
    if (!nextValue || typeof nextValue !== 'object' || Array.isArray(nextValue)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  });
}
