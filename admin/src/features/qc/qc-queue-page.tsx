import { Button, Group, Modal, Select, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { unassignQcRecord } from '../../api/qc-api';
import { listRecords } from '../../api/records-api';
import type { RecordListItem } from '../../api/types';
import { ListPageLayout, type TableRow } from '../../components/list-page-layout';

export function QcQueuePage() {
  const queryClient = useQueryClient();
  const [unassignTarget, setUnassignTarget] = useState<RecordListItem | null>(null);
  const [unassignOpen, unassignHandlers] = useDisclosure(false);
  const { data, isLoading } = useQuery({
    queryKey: ['qc-queue'],
    queryFn: () =>
      listRecords({
        status: 'QC Required,Returned for Correction,Verified,Locked',
      }),
  });

  const unassignMutation = useMutation({
    mutationFn: (recordId: string) => unassignQcRecord(recordId),
    onSuccess: async (result) => {
      notifications.show({
        color: 'green',
        title: 'QC assignment removed',
        message: `The record is back to ${result.status}.`,
      });
      unassignHandlers.close();
      setUnassignTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['qc-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['records'] }),
      ]);
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Could not unassign QC',
        message: error.message,
      });
    },
  });

  const records = data?.data ?? [];
  const rows: TableRow[] = records.map((record) => {
    const awaitingQc = record.status === 'QC Required';

    return {
      id: record._id,
      values: {
        studyId: record.study_id,
        status: record.status,
        reviewer: record.reviewer_name || 'Assigned reviewer',
        updatedAt: record.updated_at
          ? new Date(record.updated_at).toLocaleString()
          : 'Not available',
        actions: awaitingQc ? (
          <Group gap="xs" wrap="nowrap">
            <Button component={Link} to={`/qc/${record._id}/form`} size="xs" variant="light">
              Open QC form
            </Button>
            <Button component={Link} to={`/qc/${record._id}`} size="xs" variant="outline">
              Compare
            </Button>
            <Button
              size="xs"
              variant="outline"
              color="red"
              onClick={() => {
                setUnassignTarget(record);
                unassignHandlers.open();
              }}
            >
              Unassign
            </Button>
          </Group>
        ) : (
          <Button component={Link} to={`/qc/${record._id}`} size="sm" variant="light">
            Review
          </Button>
        ),
      },
    };
  });

  return (
    <>
    <ListPageLayout
      title="QC queue"
      summaryItems={[
        { label: 'records', value: `${records.length}` },
        {
          label: 'needs comparison',
          value: `${records.filter((record) => record.status === 'QC Required').length}`,
        },
        {
          label: 'returned',
          value: `${records.filter((record) => record.status === 'Returned for Correction').length}`,
        },
      ]}
      columns={[
        { key: 'studyId', label: 'Study ID' },
        { key: 'status', label: 'Status' },
        { key: 'reviewer', label: 'Reviewer' },
        { key: 'updatedAt', label: 'Last updated' },
        { key: 'actions', label: 'Actions' },
      ]}
      rows={rows}
      emptyMessage={isLoading ? 'Loading QC queue...' : 'No QC records are waiting right now.'}
      filterSlot={
        <Group align="end" wrap="wrap">
          <TextInput
            label="Search"
            placeholder="Search by study ID"
            size="md"
            styles={{ input: { minHeight: 44 } }}
          />
          <Select
            label="Status"
            placeholder="All"
            data={['All', 'QC Required', 'Returned for Correction', 'Verified', 'Locked']}
            size="md"
          />
          <TextInput
            label="Reviewer"
            placeholder="Any reviewer"
            size="md"
            styles={{ input: { minHeight: 44 } }}
          />
          <Button size="md" variant="outline">
            Apply filters
          </Button>
        </Group>
      }
    />
    <Modal
      opened={unassignOpen}
      onClose={() => {
        unassignHandlers.close();
        setUnassignTarget(null);
      }}
      title="Unassign QC"
    >
      <Stack>
        <Text size="sm">
          Remove QC from study {unassignTarget?.study_id ?? 'this record'} and return it to the
          status it had before assignment.
        </Text>
        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={() => {
              unassignHandlers.close();
              setUnassignTarget(null);
            }}
          >
            Cancel
          </Button>
          <Button
            color="red"
            loading={unassignMutation.isPending}
            onClick={() => {
              if (unassignTarget) {
                unassignMutation.mutate(unassignTarget._id);
              }
            }}
          >
            Unassign
          </Button>
        </Group>
      </Stack>
    </Modal>
    </>
  );
}
