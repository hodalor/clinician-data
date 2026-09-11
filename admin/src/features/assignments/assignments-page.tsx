import { Button, Group, Select, TextInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listAssignments } from '../../api/assignments-api';
import { ListPageLayout, type SummaryItem, type TableRow } from '../../components/list-page-layout';

export function AssignmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: listAssignments,
  });

  const assignments = data?.data ?? [];
  const summaryItems: SummaryItem[] = [
    { label: 'assignments', value: `${assignments.length}` },
    {
      label: 'active',
      value: `${assignments.filter((assignment) => assignment.status.toLowerCase() === 'active').length}`,
    },
    {
      label: 'records completed',
      value: `${assignments.reduce((sum, assignment) => sum + assignment.progress.completed_records, 0)}`,
    },
  ];

  const rows: TableRow[] = assignments.map((assignment) => ({
    id: assignment.id,
    values: {
      ra: assignment.ra_name,
      dateRange: `${new Date(assignment.date_range.from).toLocaleDateString()} - ${new Date(assignment.date_range.to).toLocaleDateString()}`,
      source: `${assignment.register_pages.join(', ') || 'None'} / ${assignment.file_ranges.join(', ') || 'None'}`,
      status: assignment.status,
      progress: `${assignment.progress.completed_records}/${assignment.progress.total_records}`,
      actions: (
        <Group gap="xs">
          <Button
            component={Link}
            to={`/assignments/${assignment.id}`}
            size="sm"
            variant="light"
          >
            View
          </Button>
          <Button
            component={Link}
            to={`/assignments/${assignment.id}/edit`}
            size="sm"
            variant="outline"
          >
            Edit
          </Button>
        </Group>
      ),
    },
  }));

  return (
    <ListPageLayout
      title="Assignments"
      summaryItems={summaryItems}
      columns={[
        { key: 'ra', label: 'Research assistant' },
        { key: 'dateRange', label: 'Date range' },
        { key: 'source', label: 'Register pages / file ranges' },
        { key: 'status', label: 'Status' },
        { key: 'progress', label: 'Progress' },
        { key: 'actions', label: 'Actions' },
      ]}
      rows={rows}
      emptyMessage={isLoading ? 'Loading assignments...' : 'No assignments yet.'}
      filterSlot={
        <Group align="end" wrap="wrap" justify="space-between">
          <Group align="end" wrap="wrap">
            <TextInput
              label="Search"
              placeholder="Search by RA name"
              size="md"
              styles={{ input: { minHeight: 44 } }}
            />
            <Select
              label="Status"
              placeholder="All"
              data={['All', 'Active', 'Paused', 'Closed']}
              size="md"
            />
            <TextInput
              label="Date range"
              placeholder="Any date"
              size="md"
              styles={{ input: { minHeight: 44 } }}
            />
          </Group>
          <Group align="end">
            <Button component={Link} to="/assignments/new" size="md">
              Create assignment
            </Button>
          </Group>
        </Group>
      }
    />
  );
}
