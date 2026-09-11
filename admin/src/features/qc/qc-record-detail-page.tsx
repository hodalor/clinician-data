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
import { useNavigate, useParams } from 'react-router-dom';
import { getQcComparison, resolveQcRecord } from '../../api/qc-api';
import { getRecord } from '../../api/records-api';
import {
  formatRecordFieldLabel,
  formatRecordValue,
} from '../records/record-decoders';

export function QcRecordDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { recordId } = useParams();
  const [returnModalOpen, returnModalHandlers] = useDisclosure(false);
  const [returnReason, setReturnReason] = useState('');

  const recordQuery = useQuery({
    queryKey: ['record', recordId],
    queryFn: () => getRecord(recordId!),
    enabled: Boolean(recordId),
  });
  const comparisonQuery = useQuery({
    queryKey: ['qc-compare', recordId],
    queryFn: () => getQcComparison(recordId!),
    enabled: Boolean(recordId),
  });

  const correctedValues = useMemo(() => {
    const output: Record<string, unknown> = {};
    for (const row of comparisonQuery.data?.comparisons ?? []) {
      setNestedValue(output, row.field, row.qc_value);
    }
    return output;
  }, [comparisonQuery.data?.comparisons]);

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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['qc-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['qc-compare', recordId] }),
      ]);
      navigate('/qc');
    },
  });

  if (recordQuery.error || comparisonQuery.error) {
    return (
      <Alert color="red" title="Could not load QC record">
        {recordQuery.error?.message ?? comparisonQuery.error?.message}
      </Alert>
    );
  }

  const comparison = comparisonQuery.data;

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="lg">
        <Stack gap={4}>
          <Title order={2}>QC record detail</Title>
          <Text c="dimmed">
            Review the original abstraction against the QC re-abstraction and choose the next action.
          </Text>
        </Stack>
        <Group gap="xl" mt="md">
          <Text size="sm">
            <strong>Study ID:</strong> {recordQuery.data?.record.study_id ?? 'Loading...'}
          </Text>
          <Text size="sm">
            <strong>Status:</strong> {recordQuery.data?.record.status ?? 'Loading...'}
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
              <Table.Tr key={row.field}>
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
        <Button
          onClick={() => resolveMutation.mutate({ action: 'approve' })}
          loading={resolveMutation.isPending}
        >
          Approve
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            resolveMutation.mutate({
              action: 'correct',
              corrected_values: correctedValues,
            })
          }
          loading={resolveMutation.isPending}
        >
          Correct
        </Button>
        <Button
          variant="outline"
          color="orange"
          onClick={returnModalHandlers.open}
          loading={resolveMutation.isPending}
        >
          Return to RA
        </Button>
        <Button
          variant="outline"
          onClick={() => resolveMutation.mutate({ action: 'verify-and-lock' })}
          loading={resolveMutation.isPending}
        >
          Verify and lock
        </Button>
      </Group>

      <Modal opened={returnModalOpen} onClose={returnModalHandlers.close} title="Return to RA">
        <Stack>
          <Textarea
            label="Reason"
            placeholder="Explain what needs correction"
            minRows={4}
            value={returnReason}
            onChange={(event) => setReturnReason(event.currentTarget.value)}
          />
          <Button
            onClick={() =>
              resolveMutation.mutate({
                action: 'return-to-RA',
                reason: returnReason,
                qc_comment: returnReason,
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
