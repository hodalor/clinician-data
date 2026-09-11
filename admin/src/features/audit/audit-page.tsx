import { Button, Group, Text, TextInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { listAuditLogs } from '../../api/audit-api';
import { ListPageLayout } from '../../components/list-page-layout';

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return 'Blank';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

export function AuditPage() {
  const [draftFilters, setDraftFilters] = useState({
    study_id: '',
    field: '',
    changed_by: '',
    from: '',
    to: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(draftFilters);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', appliedFilters],
    queryFn: () => listAuditLogs(appliedFilters),
  });

  const entries = data?.data ?? [];
  const reopenedCount = entries.filter(
    (entry) =>
      entry.field === 'status' && entry.new_value === 'Returned for Correction',
  ).length;
  const correctionCount = entries.filter((entry) =>
    entry.reason.toLowerCase().includes('qc'),
  ).length;

  return (
    <ListPageLayout
      title="Audit"
      summaryItems={[
        { label: 'audited changes', value: `${entries.length}` },
        { label: 'reopened records', value: `${reopenedCount}` },
        { label: 'post-QC corrections', value: `${correctionCount}` },
      ]}
      columns={[
        { key: 'studyId', label: 'Study ID' },
        { key: 'field', label: 'Field changed' },
        { key: 'change', label: 'What changed' },
        { key: 'changedBy', label: 'Changed by' },
        { key: 'changedAt', label: 'When' },
        { key: 'reason', label: 'Why' },
      ]}
      rows={entries.map((entry) => ({
        id: entry.id,
        values: {
          studyId: entry.study_id ? (
            <Text
              component={Link}
              to={`/records/${entry.research_record_id}`}
              fw={600}
              c="dark"
            >
              {entry.study_id}
            </Text>
          ) : (
            'Unknown record'
          ),
          field: entry.field,
          change: (
            <Text size="sm">
              {formatValue(entry.previous_value)}{' '}
              <Text component="span" inherit fw={600}>
                to
              </Text>{' '}
              {formatValue(entry.new_value)}
            </Text>
          ),
          changedBy: entry.changed_by_name ?? 'Unknown user',
          changedAt: new Date(entry.changed_at).toLocaleString(),
          reason: entry.reason,
        },
      }))}
      emptyMessage={isLoading ? 'Loading audit trail...' : 'No audit entries yet.'}
      filterSlot={
        <Group align="end" wrap="wrap">
          <TextInput
            label="Study ID"
            placeholder="Any study ID"
            value={draftFilters.study_id}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                study_id: event.currentTarget.value,
              }))
            }
          />
          <TextInput
            label="Field"
            placeholder="Any field"
            value={draftFilters.field}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                field: event.currentTarget.value,
              }))
            }
          />
          <TextInput
            label="Changed by"
            placeholder="Any user id"
            value={draftFilters.changed_by}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                changed_by: event.currentTarget.value,
              }))
            }
          />
          <TextInput
            label="From date"
            type="date"
            value={draftFilters.from}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                from: event.currentTarget.value,
              }))
            }
          />
          <TextInput
            label="To date"
            type="date"
            value={draftFilters.to}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                to: event.currentTarget.value,
              }))
            }
          />
          <Button variant="outline" onClick={() => setAppliedFilters(draftFilters)}>
            Apply filters
          </Button>
        </Group>
      }
    />
  );
}
