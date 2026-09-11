import { Button, Group, Select, TextInput } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteAssignment, listAssignments } from '../../api/assignments-api';
import { DeleteConfirmModal } from '../../components/delete-confirm-modal';
import { ListPageLayout, type SummaryItem, type TableRow } from '../../components/list-page-layout';

export function AssignmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: listAssignments,
  });
  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      deleteAssignment(id, { reason }),
    onSuccess: async () => {
      setDeleteTarget(null);
      setDeleteReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assignments'] }),
        queryClient.invalidateQueries({ queryKey: ['superbin'] }),
      ]);
    },
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
    onClick: () => navigate(`/assignments/${assignment.id}`),
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
            onClick={(event) => event.stopPropagation()}
          >
            View
          </Button>
          <Button
            component={Link}
            to={`/assignments/${assignment.id}/edit`}
            size="sm"
            variant="outline"
            onClick={(event) => event.stopPropagation()}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            color="red"
            onClick={(event) => {
              event.stopPropagation();
              setDeleteTarget({
                id: assignment.id,
                label: `${assignment.ra_name} · ${assignment.status}`,
              });
            }}
          >
            Delete
          </Button>
        </Group>
      ),
    },
  }));

  return (
    <>
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
      <DeleteConfirmModal
        opened={deleteTarget !== null}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteReason('');
        }}
        title="Delete assignment"
        description={`This will move ${deleteTarget?.label ?? 'this assignment'} to the superbin first.`}
        reason={deleteReason}
        onReasonChange={setDeleteReason}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate({ id: deleteTarget.id, reason: deleteReason });
          }
        }}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
