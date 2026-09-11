import { Button, Group, Select, TextInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getAssignmentOptions } from '../../api/assignments-api';
import { listRecords } from '../../api/records-api';
import { ListPageLayout } from '../../components/list-page-layout';

export function RecordsPage() {
  const [filters, setFilters] = useState({
    status: '',
    extractor_id: '',
    from: '',
    to: '',
    sats_cat: '',
    mode: '',
  });
  const [draftFilters, setDraftFilters] = useState(filters);

  const { data, isLoading } = useQuery({
    queryKey: ['records', filters],
    queryFn: () =>
      listRecords({
        status: filters.status || undefined,
        extractor_id: filters.extractor_id || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        sats_cat: filters.sats_cat || undefined,
        mode: filters.mode || undefined,
      }),
  });
  const optionsQuery = useQuery({
    queryKey: ['assignment-options-for-record-filters'],
    queryFn: getAssignmentOptions,
  });

  const records = data?.data ?? [];
  const raNameById = new Map(
    (optionsQuery.data?.ras ?? []).map((user) => [user.id, user.full_name]),
  );

  return (
    <ListPageLayout
      title="Records"
      summaryItems={[
        { label: 'records', value: `${records.length}` },
        {
          label: 'synced',
          value: `${records.filter((row) => row.status === 'Synced').length}`,
        },
        {
          label: 'verified',
          value: `${records.filter((row) => row.status === 'Verified').length}`,
        },
        {
          label: 'locked',
          value: `${records.filter((row) => row.status === 'Locked').length}`,
        },
      ]}
      columns={[
        { key: 'studyId', label: 'Study ID' },
        { key: 'status', label: 'Status' },
        { key: 'extractor', label: 'Research assistant' },
        { key: 'updatedAt', label: 'Last updated' },
        { key: 'actions', label: 'Actions' },
      ]}
      rows={records.map((record) => ({
        id: record._id,
        values: {
          studyId: record.study_id,
          status: record.status,
          extractor: record.extractor_id
            ? (raNameById.get(record.extractor_id) ?? record.extractor_id)
            : 'Not assigned',
          updatedAt: record.updated_at
            ? new Date(record.updated_at).toLocaleString()
            : 'Not available',
          actions: (
            <Button component={Link} to={`/records/${record._id}`} size="sm" variant="light">
              View
            </Button>
          ),
        },
      }))}
      emptyMessage={isLoading ? 'Loading records...' : 'No records matched these filters.'}
      filterSlot={
        <Group align="end" wrap="wrap">
          <Select
            label="Status"
            placeholder="All"
            data={[
              'Draft',
              'Clinical Data Complete - Outcome Pending',
              'Complete',
              'Pending Sync',
              'Sync Failed',
              'Synced',
              'QC Required',
              'Returned for Correction',
              'Verified',
              'Locked',
              'Excluded',
            ]}
            value={draftFilters.status}
            onChange={(value) => setDraftFilters((current) => ({ ...current, status: value ?? '' }))}
          />
          <Select
            label="Research assistant"
            placeholder="Any RA"
            searchable
            data={(optionsQuery.data?.ras ?? []).map((user) => ({
              value: user.id,
              label: user.full_name,
            }))}
            value={draftFilters.extractor_id}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, extractor_id: value ?? '' }))
            }
          />
          <TextInput
            label="From"
            type="date"
            value={draftFilters.from}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, from: event.currentTarget.value }))
            }
          />
          <TextInput
            label="To"
            type="date"
            value={draftFilters.to}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, to: event.currentTarget.value }))
            }
          />
          <Select
            label="SATS category"
            placeholder="Any"
            data={['1', '2', '3', '4']}
            value={draftFilters.sats_cat}
            onChange={(value) => setDraftFilters((current) => ({ ...current, sats_cat: value ?? '' }))}
          />
          <Select
            label="Mode"
            placeholder="Any"
            data={['PILOT', 'TRAINING', 'PRODUCTION']}
            value={draftFilters.mode}
            onChange={(value) => setDraftFilters((current) => ({ ...current, mode: value ?? '' }))}
          />
          <Button onClick={() => setFilters(draftFilters)}>Apply filters</Button>
        </Group>
      }
    />
  );
}
