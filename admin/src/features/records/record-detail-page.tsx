import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  SimpleGrid,
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
import { Link, useParams } from 'react-router-dom';
import { getRecord, getRecordAuditHistory, reopenRecord } from '../../api/records-api';
import type { RecordListItem } from '../../api/types';
import { useAuth } from '../auth/use-auth';
import {
  formatGenericValue,
  formatRecordFieldLabel,
  formatRecordValue,
} from './record-decoders';

const hiddenFields = new Set([
  '_id',
  '__v',
  'extractor_id',
  'linkage_id',
]);

export function RecordDetailPage() {
  const { recordId } = useParams();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [reopenReason, setReopenReason] = useState('');
  const [reopenModalOpen, reopenModalHandlers] = useDisclosure(false);

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

  const reopenMutation = useMutation({
    mutationFn: () => reopenRecord(recordId!, reopenReason),
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: 'Record reopened',
        message: 'The record was returned for correction successfully.',
      });
      reopenModalHandlers.close();
      setReopenReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['record-detail', recordId] }),
        queryClient.invalidateQueries({ queryKey: ['record-audit', recordId] }),
        queryClient.invalidateQueries({ queryKey: ['records'] }),
      ]);
    },
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
  const sectionEntries = useMemo(() => buildSectionEntries(record), [record]);
  const canOpenQc =
    session?.user.role === 'PI' ||
    session?.user.role === 'QC' ||
    session?.user.role === 'SUPERADMIN';
  const canReopen =
    (session?.user.role === 'PI' || session?.user.role === 'SUPERADMIN') &&
    record?.status === 'Locked';
  const qcComment = record?.data_quality?.qc_comment;
  const unresolvedDuplicates =
    record?.duplicate_flags?.filter((flag) => !flag.resolved) ?? [];

  return (
    <Stack gap="md">
      <Paper
        withBorder
        radius="xl"
        p="xl"
        style={{
          background:
            'linear-gradient(135deg, rgba(27,20,10,0.96), rgba(58,43,17,0.96))',
          borderColor: '#e3c88b',
          color: '#fff7e6',
        }}
      >
        <Group justify="space-between" align="flex-start">
          <Stack gap="xs">
            <Title order={2} c="#fff7e6">
              Record detail
            </Title>
            <Group gap="sm">
              <Badge radius="sm" size="lg" color="yellow">
                {record?.study_id ?? 'Loading...'}
              </Badge>
              <Badge radius="sm" size="lg" variant="light" color="gray">
                {record?.status ?? 'Loading...'}
              </Badge>
              {record?.mode ? (
                <Badge radius="sm" size="lg" variant="outline" color="yellow">
                  {record.mode}
                </Badge>
              ) : null}
            </Group>
            <Text c="#f2dfb8">
              Version {record?.version ?? 0}
              {record?.updated_at
                ? ` • Updated ${new Date(record.updated_at).toLocaleString()}`
                : ''}
            </Text>
          </Stack>

          <Group gap="sm">
            <Button component={Link} to="/records" variant="white" color="dark">
              Back to records
            </Button>
            {canOpenQc ? (
              <Button component={Link} to={`/qc/${recordId}`} color="yellow">
                Open QC review
              </Button>
            ) : null}
            {unresolvedDuplicates.length > 0 && canOpenQc ? (
              <Button component={Link} to="/duplicates" variant="outline" color="yellow">
                Check duplicates
              </Button>
            ) : null}
            {canReopen ? (
              <Button color="yellow" variant="filled" onClick={reopenModalHandlers.open}>
                Return for correction
              </Button>
            ) : null}
          </Group>
        </Group>
      </Paper>

      {qcComment ? (
        <Alert color="yellow" title="QC / correction comment">
          {qcComment}
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Paper withBorder radius="md" p="lg" style={paperStyle}>
          <Text size="xs" tt="uppercase" fw={700} c="#8b6b2c">
            Status
          </Text>
          <Stack gap={10} mt="sm">
            <KeyValue label="Study ID" value={record?.study_id} />
            <KeyValue label="Status" value={record?.status} />
            <KeyValue label="Mode" value={record?.mode} />
            <KeyValue label="Extractor" value={record?.extractor_id} />
            <KeyValue
              label="QC required"
              value={formatRecordValue(
                'data_quality.qc_required',
                record?.data_quality?.qc_required,
                'Not available',
              )}
            />
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="lg" style={paperStyle}>
          <Text size="xs" tt="uppercase" fw={700} c="#8b6b2c">
            Timestamps
          </Text>
          <Stack gap={10} mt="sm">
            <KeyValue
              label="Created"
              value={record?.created_at ? new Date(record.created_at).toLocaleString() : null}
            />
            <KeyValue
              label="Updated"
              value={record?.updated_at ? new Date(record.updated_at).toLocaleString() : null}
            />
            <KeyValue label="Version" value={record?.version?.toString()} />
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="lg" style={paperStyle}>
          <Text size="xs" tt="uppercase" fw={700} c="#8b6b2c">
            Workflow
          </Text>
          <Stack gap={10} mt="sm">
            <Text size="sm" c="dimmed">
              QC review, return-to-RA comments, locking, and duplicate resolution are available
              through the record and QC pages. This panel keeps the main actions one click away.
            </Text>
            <Group gap="sm">
              <Button component={Link} to="/qc" variant="light" color="yellow">
                QC queue
              </Button>
              <Button component={Link} to="/audit" variant="light" color="dark">
                Audit trail
              </Button>
            </Group>
          </Stack>
        </Paper>
      </SimpleGrid>

      {unresolvedDuplicates.length > 0 ? (
        <Paper withBorder radius="md" p="lg" style={paperStyle}>
          <Title order={4}>Duplicate flags</Title>
          <Stack gap="sm" mt="md">
            {unresolvedDuplicates.map((flag, index) => (
              <Text key={`${flag.matched_record_id ?? index}-${index}`}>
                Possible match with {flag.matched_record_id ?? 'another record'} based on{' '}
                {flag.basis.join(', ')}.
              </Text>
            ))}
          </Stack>
        </Paper>
      ) : null}

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {sectionEntries.map((section) => (
          <Paper key={section.title} withBorder radius="md" p="lg" style={paperStyle}>
            <Title order={4}>{section.title}</Title>
            <Divider my="sm" />
            <Table withTableBorder striped>
              <Table.Tbody>
                {section.rows.map((row) => (
                  <Table.Tr key={`${section.title}-${row.label}`}>
                    <Table.Th w={180}>{row.label}</Table.Th>
                    <Table.Td>{row.value}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        ))}
      </SimpleGrid>

      <Paper withBorder radius="md" p="lg" style={paperStyle}>
        <Title order={3}>Audit history</Title>
        <Stack gap="sm" mt="md">
          {auditHistory.length === 0 ? (
            <Text c="dimmed">No audit history found for this record.</Text>
          ) : (
            auditHistory.map((entry) => (
              <Paper key={entry.id} radius="md" p="sm" withBorder>
                <Text fw={600} size="sm">
                  {new Date(entry.changed_at).toLocaleString()} •{' '}
                  {entry.changed_by_name ?? 'Unknown user'}
                </Text>
                <Text size="sm" c="dimmed" mt={4}>
                  {formatRecordFieldLabel(entry.field)} changed from "
                  {formatRecordValue(entry.field, entry.previous_value, 'Blank')}" to "
                  {formatRecordValue(entry.field, entry.new_value, 'Blank')}"
                  {entry.reason ? ` (${entry.reason})` : ''}
                </Text>
              </Paper>
            ))
          )}
        </Stack>
      </Paper>

      <Modal
        opened={reopenModalOpen}
        onClose={reopenModalHandlers.close}
        title="Return record for correction"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Add a clear correction comment for the RA. This will reopen the locked record and
            place it back in the correction workflow.
          </Text>
          <Textarea
            label="Correction comment"
            minRows={4}
            value={reopenReason}
            onChange={(event) => setReopenReason(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={reopenModalHandlers.close}>
              Cancel
            </Button>
            <Button
              color="yellow"
              onClick={() => reopenMutation.mutate()}
              loading={reopenMutation.isPending}
              disabled={reopenReason.trim().length === 0}
            >
              Return to RA
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function KeyValue({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Group justify="space-between" align="flex-start">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={600} maw="65%" ta="right">
        {value && value.length > 0 ? value : 'Not available'}
      </Text>
    </Group>
  );
}

function buildSectionEntries(record: RecordListItem | undefined) {
  if (!record) {
    return [];
  }

  const sections = [
    { title: 'Eligibility', path: 'eligibility', value: record.eligibility },
    { title: 'Patient', path: 'patient', value: record.patient },
    { title: 'SATS / TEWS', path: 'sats', value: record.sats },
    { title: 'Physiology', path: 'physiology', value: record.physiology },
    { title: 'Presentation', path: 'presentation', value: record.presentation },
    { title: 'Outcome', path: 'outcome', value: record.outcome },
    { title: 'Process', path: 'process', value: record.process },
    { title: 'Data quality', path: 'data_quality', value: record.data_quality },
  ];

  return sections
    .map((section) => ({
      title: section.title,
      rows: flattenSectionRows(section.value, section.path),
    }))
    .filter((section) => section.rows.length > 0);
}

function flattenSectionRows(
  value: unknown,
  pathPrefix = '',
): Array<{ label: string; value: string }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, entryValue]) => {
    if (hiddenFields.has(key)) {
      return [];
    }

    const nextPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    const label = formatRecordFieldLabel(nextPath);

    if (entryValue && typeof entryValue === 'object' && !Array.isArray(entryValue)) {
      return flattenSectionRows(entryValue, nextPath);
    }

    if (Array.isArray(entryValue)) {
      return [
        {
          label,
          value: entryValue.map((item) => formatGenericValue(item)).join(', '),
        },
      ];
    }

    return [
      {
        label,
        value: formatRecordValue(nextPath, entryValue, 'Empty'),
      },
    ];
  });
}

const paperStyle = {
  background: 'rgba(255,255,255,0.97)',
  borderColor: '#e4d3ab',
  boxShadow: '0 20px 50px rgba(30, 21, 8, 0.06)',
};
