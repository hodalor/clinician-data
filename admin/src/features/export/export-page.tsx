import {
  Alert,
  Box,
  Card,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { downloadExport } from '../../api/export-api';
import { satsCategoryOptions } from '../records/record-decoders';

type ExportFilters = {
  status: string;
  from: string;
  to: string;
  sats_cat: string;
  ra: string;
  mode: string;
  eligible: string;
};

type ExportItem = {
  endpoint:
    | 'master.csv'
    | 'master.xlsx'
    | 'codebook.xlsx'
    | 'qc-report.xlsx'
    | 'missing-data-report.xlsx'
    | 'exclusion-log.xlsx'
    | 'progress-report.xlsx';
  label: string;
  fileName: string;
  helper: string;
  icon: 'csv' | 'excel' | 'codebook' | 'qc' | 'missing' | 'exclusion' | 'progress';
};

const exportItems: ExportItem[] = [
  {
    endpoint: 'master.csv',
    label: 'Master data CSV',
    fileName: 'master-data.csv',
    helper: 'Spreadsheet-ready text table',
    icon: 'csv',
  },
  {
    endpoint: 'master.xlsx',
    label: 'Master data Excel',
    fileName: 'master-data.xlsx',
    helper: 'Main data table for Excel',
    icon: 'excel',
  },
  {
    endpoint: 'codebook.xlsx',
    label: 'Codebook',
    fileName: 'codebook.xlsx',
    helper: 'Variables, labels, and codes',
    icon: 'codebook',
  },
  {
    endpoint: 'qc-report.xlsx',
    label: 'QC report',
    fileName: 'qc-report.xlsx',
    helper: 'Agreement and comparison tables',
    icon: 'qc',
  },
  {
    endpoint: 'missing-data-report.xlsx',
    label: 'Missing-data report',
    fileName: 'missing-data-report.xlsx',
    helper: 'Missingness tables by RA and date',
    icon: 'missing',
  },
  {
    endpoint: 'exclusion-log.xlsx',
    label: 'Exclusion log',
    fileName: 'exclusion-log.xlsx',
    helper: 'Excluded records in table form',
    icon: 'exclusion',
  },
  {
    endpoint: 'progress-report.xlsx',
    label: 'Progress report',
    fileName: 'progress-report.xlsx',
    helper: 'Study progress tables by status and RA',
    icon: 'progress',
  },
];

export function ExportPage() {
  const [filters, setFilters] = useState<ExportFilters>({
    status: '',
    from: '',
    to: '',
    sats_cat: '',
    ra: '',
    mode: '',
    eligible: '',
  });

  async function handleDownload(item: ExportItem) {
    try {
      const blob = await downloadExport(item.endpoint, {
        status: filters.status || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        sats_cat: filters.sats_cat || undefined,
        ra: filters.ra || undefined,
        mode: filters.mode || undefined,
        eligible: filters.eligible || undefined,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notifications.show({
        color: 'green',
        title: 'Export ready',
        message: `${item.label} has started downloading.`,
      });
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Download failed',
        message:
          error instanceof Error
            ? error.message
            : 'Could not download export.',
      });
    }
  }

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={2}>Export</Title>
        <Text c="dimmed">
          Choose the filters once, then tap the spreadsheet you need.
        </Text>
      </Stack>

      <Paper withBorder radius="md" p="md">
        <Group align="end" wrap="wrap">
          <Select
            label="Status"
            data={['all', 'completed', 'verified']}
            value={filters.status}
            onChange={(value) =>
              setFilters((current) => ({ ...current, status: value ?? '' }))
            }
          />
          <TextInput
            label="From"
            type="date"
            value={filters.from}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                from: event.currentTarget.value,
              }))
            }
          />
          <TextInput
            label="To"
            type="date"
            value={filters.to}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                to: event.currentTarget.value,
              }))
            }
          />
          <Select
            label="SATS category"
            data={satsCategoryOptions}
            value={filters.sats_cat}
            onChange={(value) =>
              setFilters((current) => ({ ...current, sats_cat: value ?? '' }))
            }
          />
          <TextInput
            label="Research assistant ID"
            placeholder="Optional RA id"
            value={filters.ra}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                ra: event.currentTarget.value,
              }))
            }
          />
          <Select
            label="Mode"
            data={['PILOT', 'TRAINING', 'PRODUCTION']}
            value={filters.mode}
            onChange={(value) =>
              setFilters((current) => ({ ...current, mode: value ?? '' }))
            }
          />
          <Select
            label="Eligible / excluded"
            data={[
              { value: 'eligible', label: 'Eligible' },
              { value: 'excluded', label: 'Excluded' },
              { value: 'all', label: 'All' },
            ]}
            value={filters.eligible}
            onChange={(value) =>
              setFilters((current) => ({ ...current, eligible: value ?? '' }))
            }
          />
        </Group>
      </Paper>

      <Alert color="yellow" title="Research-use warning">
        These files are for approved research work only. Each option below
        downloads a spreadsheet table that can be opened directly in Excel.
      </Alert>

      <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md">
        {exportItems.map((item) => (
          <UnstyledButton
            key={item.endpoint}
            onClick={() => void handleDownload(item)}
          >
            <Card withBorder radius="lg" padding="md" h="100%">
              <Stack align="center" gap="sm">
                <ExportTileIcon type={item.icon} />
                <Stack gap={2} align="center">
                  <Text fw={700} ta="center">
                    {item.label}
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    {item.helper}
                  </Text>
                </Stack>
              </Stack>
            </Card>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function ExportTileIcon({ type }: { type: ExportItem['icon'] }) {
  const palette = {
    csv: { primary: '#2f9e44', accent: '#d3f9d8', label: 'CSV' },
    excel: { primary: '#2b8a3e', accent: '#d8f5dc', label: 'XLSX' },
    codebook: { primary: '#1c7ed6', accent: '#dbeafe', label: 'BOOK' },
    qc: { primary: '#c92a2a', accent: '#ffe3e3', label: 'QC' },
    missing: { primary: '#f08c00', accent: '#fff3bf', label: 'MISS' },
    exclusion: { primary: '#495057', accent: '#f1f3f5', label: 'LOG' },
    progress: { primary: '#0b7285', accent: '#d3f9fa', label: 'PROG' },
  }[type];

  return (
    <Box
      style={{
        width: 88,
        height: 88,
        borderRadius: 20,
        background: `linear-gradient(180deg, ${palette.accent}, #ffffff)`,
        border: `1px solid ${palette.primary}33`,
        boxShadow: '0 12px 24px rgba(20, 20, 20, 0.10)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <svg width="56" height="56" viewBox="0 0 96 96" role="img" aria-label={palette.label}>
        <rect x="18" y="12" width="60" height="72" rx="12" fill="white" stroke={palette.primary} strokeWidth="4" />
        <rect x="28" y="24" width="40" height="12" rx="6" fill={palette.primary} opacity="0.16" />
        <rect x="28" y="42" width="16" height="10" rx="4" fill={palette.primary} opacity="0.2" />
        <rect x="48" y="42" width="20" height="10" rx="4" fill={palette.primary} opacity="0.2" />
        <rect x="28" y="56" width="16" height="10" rx="4" fill={palette.primary} opacity="0.2" />
        <rect x="48" y="56" width="20" height="10" rx="4" fill={palette.primary} opacity="0.2" />
        <rect x="24" y="68" width="48" height="10" rx="5" fill={palette.primary} />
        <text x="48" y="76" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">
          {palette.label}
        </text>
      </svg>
    </Box>
  );
}
