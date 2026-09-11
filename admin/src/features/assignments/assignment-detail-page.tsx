import { Alert, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getAssignmentDetail } from '../../api/assignments-api';
import { ListPageLayout } from '../../components/list-page-layout';

export function AssignmentDetailPage() {
  const { assignmentId } = useParams();
  const { data, error, isLoading } = useQuery({
    queryKey: ['assignment-detail', assignmentId],
    queryFn: () => getAssignmentDetail(assignmentId!),
    enabled: Boolean(assignmentId),
  });

  if (error) {
    return (
      <Alert color="red" title="Could not load assignment">
        {error.message}
      </Alert>
    );
  }

  const assignment = data?.assignment;
  const records = data?.records ?? [];

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="lg">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Text fw={700} size="lg">
              Assignment detail
            </Text>
            <Text c="dimmed">Review the assignment and the records under it.</Text>
          </Stack>
          {assignmentId ? (
            <Button component={Link} to={`/assignments/${assignmentId}/edit`} variant="outline">
              Edit assignment
            </Button>
          ) : null}
        </Group>
        {assignment ? (
          <Group mt="md" gap="xl" align="flex-start">
            <Text size="sm">
              <strong>RA:</strong> {assignment.ra_name}
            </Text>
            <Text size="sm">
              <strong>Date range:</strong>{' '}
              {new Date(assignment.date_range.from).toLocaleDateString()} -{' '}
              {new Date(assignment.date_range.to).toLocaleDateString()}
            </Text>
            <Text size="sm">
              <strong>Status:</strong> {assignment.status}
            </Text>
          </Group>
        ) : null}
      </Paper>

      <ListPageLayout
        title="Assigned records"
        summaryItems={[
          { label: 'records', value: `${records.length}` },
          { label: 'completed', value: `${assignment?.progress.completed_records ?? 0}` },
          { label: 'in progress', value: `${Math.max((assignment?.progress.total_records ?? 0) - (assignment?.progress.completed_records ?? 0), 0)}` },
        ]}
        columns={[
          { key: 'studyId', label: 'Study ID' },
          { key: 'status', label: 'Status' },
          { key: 'updatedAt', label: 'Last updated' },
        ]}
        rows={records.map((record) => ({
          id: record.id,
          values: {
            studyId: record.study_id,
            status: record.status,
            updatedAt: record.updated_at
              ? new Date(record.updated_at).toLocaleString()
              : 'Not available',
          },
        }))}
        emptyMessage={isLoading ? 'Loading records...' : 'No records matched this assignment yet.'}
      />
    </Stack>
  );
}
