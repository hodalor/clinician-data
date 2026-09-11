import { Alert, Paper, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getRecord, getRecordAuditHistory } from '../../api/records-api';

export function RecordDetailPage() {
  const { recordId } = useParams();
  const recordQuery = useQuery({
    queryKey: ['record-detail', recordId],
    queryFn: () => getRecord(recordId!),
    enabled: Boolean(recordId),
  });
  const auditQuery = useQuery({
    queryKey: ['record-audit', recordId],
    queryFn: () => getRecordAuditHistory(recordId!),
    enabled: Boolean(recordId),
  });

  if (recordQuery.error || auditQuery.error) {
    return (
      <Alert color="red" title="Could not load record">
        {recordQuery.error?.message ?? auditQuery.error?.message}
      </Alert>
    );
  }

  const record = recordQuery.data?.record;
  const auditHistory = auditQuery.data?.data ?? [];

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="lg">
        <Title order={2}>Record detail</Title>
        <Text mt="sm">Study ID: {record?.study_id ?? 'Loading...'}</Text>
        <Text>Status: {record?.status ?? 'Loading...'}</Text>
      </Paper>

      <Paper withBorder radius="md" p="lg">
        <Title order={3}>Audit history</Title>
        <Stack gap="sm" mt="md">
          {auditHistory.length === 0 ? (
            <Text c="dimmed">No audit history found for this record.</Text>
          ) : (
            auditHistory.map((entry) => (
              <Text key={entry.id} size="sm">
                {new Date(entry.changed_at).toLocaleString()} -{' '}
                {entry.changed_by_name ?? 'Unknown user'} changed {entry.field} from{' '}
                "{formatAuditValue(entry.previous_value)}" to "{formatAuditValue(entry.new_value)}"
                {entry.reason ? ` (${entry.reason})` : ''}
              </Text>
            ))
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}

function formatAuditValue(value: unknown) {
  if (value === null || value === undefined) {
    return 'empty';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
