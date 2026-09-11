import { Button, Group, Select, TextInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getMissingnessReport } from '../../api/export-api';
import { ListPageLayout } from '../../components/list-page-layout';

export function MissingnessPage() {
  const [view, setView] = useState<'ra' | 'date'>('ra');
  const [filters, setFilters] = useState({ from: '', to: '', ra: '' });
  const [draftFilters, setDraftFilters] = useState(filters);

  const { data, isLoading } = useQuery({
    queryKey: ['missingness', filters],
    queryFn: () =>
      getMissingnessReport({
        from: filters.from || undefined,
        to: filters.to || undefined,
        ra: filters.ra || undefined,
      }),
  });

  const rows = (
    view === 'ra' ? data?.by_ra ?? [] : data?.by_date_range ?? []
  ).map((row: any) => ({
    id: view === 'ra' ? row.extractor_id ?? row.extractor_name ?? 'row' : row.date,
    values:
      view === 'ra'
        ? {
            group: row.extractor_name ?? 'Unassigned',
            total: row.total_records,
            missSats: row.miss_sats,
            missTews: row.miss_tews,
            missVitals: row.miss_vitals,
            missOutcome: row.miss_outcome,
          }
        : {
            group: row.date,
            total: row.total_records,
            missSats: row.miss_sats,
            missTews: row.miss_tews,
            missVitals: row.miss_vitals,
            missOutcome: row.miss_outcome,
          },
  }));

  return (
    <ListPageLayout
      title="Missingness"
      summaryItems={[
        { label: 'records', value: `${data?.summary.total_records ?? 0}` },
        { label: 'miss SATS', value: `${data?.summary.miss_sats ?? 0}` },
        { label: 'miss TEWS', value: `${data?.summary.miss_tews ?? 0}` },
        { label: 'miss vitals', value: `${data?.summary.miss_vitals ?? 0}` },
        { label: 'miss outcome', value: `${data?.summary.miss_outcome ?? 0}` },
      ]}
      columns={[
        { key: 'group', label: view === 'ra' ? 'Research assistant' : 'Date' },
        { key: 'total', label: 'Total records' },
        { key: 'missSats', label: 'Miss SATS' },
        { key: 'missTews', label: 'Miss TEWS' },
        { key: 'missVitals', label: 'Miss vitals' },
        { key: 'missOutcome', label: 'Miss outcome' },
      ]}
      rows={rows}
      emptyMessage={isLoading ? 'Loading missingness...' : 'No missingness rows to show.'}
      filterSlot={
        <Group align="end" wrap="wrap">
          <Select
            label="View"
            data={[
              { value: 'ra', label: 'By research assistant' },
              { value: 'date', label: 'By date range' },
            ]}
            value={view}
            onChange={(value) => setView((value as 'ra' | 'date') ?? 'ra')}
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
          <TextInput
            label="Research assistant ID"
            placeholder="Optional RA id"
            value={draftFilters.ra}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, ra: event.currentTarget.value }))
            }
          />
          <Button onClick={() => setFilters(draftFilters)}>Apply filters</Button>
        </Group>
      }
    />
  );
}
