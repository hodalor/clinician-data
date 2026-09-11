import { Button, Group, Select, TextInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listRecords } from '../../api/records-api';
import { ListPageLayout, type TableRow } from '../../components/list-page-layout';

export function QcQueuePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['qc-queue'],
    queryFn: () =>
      listRecords({
        status: 'QC Required,Returned for Correction,Verified,Locked',
      }),
  });

  const records = data?.data ?? [];
  const rows: TableRow[] = records.map((record) => ({
    id: record._id,
    values: {
      studyId: record.study_id,
      status: record.status,
      reviewer: record.data_quality?.reviewer_id ?? 'Assigned reviewer',
      updatedAt: record.updated_at
        ? new Date(record.updated_at).toLocaleString()
        : 'Not available',
      actions: (
        <Button component={Link} to={`/qc/${record._id}`} size="sm" variant="light">
          Review
        </Button>
      ),
    },
  }));

  return (
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
  );
}
