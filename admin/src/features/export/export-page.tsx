import {
  Alert,
  Card,
  Group,
  Image,
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
  imagePrompt: string;
};

const exportItems: ExportItem[] = [
  {
    endpoint: 'master.csv',
    label: 'Master data CSV',
    fileName: 'master-data.csv',
    helper: 'Spreadsheet-ready text table',
    imagePrompt:
      'flat app icon, spreadsheet grid with green csv label, clean white background, premium macOS dock style, realistic glossy png icon',
  },
  {
    endpoint: 'master.xlsx',
    label: 'Master data Excel',
    fileName: 'master-data.xlsx',
    helper: 'Main data table for Excel',
    imagePrompt:
      'flat app icon, excel workbook with tidy data grid, green and white palette, premium macOS dock style, realistic glossy png icon',
  },
  {
    endpoint: 'codebook.xlsx',
    label: 'Codebook',
    fileName: 'codebook.xlsx',
    helper: 'Variables, labels, and codes',
    imagePrompt:
      'flat app icon, research codebook notebook with labeled rows and columns, blue and white palette, premium macOS dock style, realistic glossy png icon',
  },
  {
    endpoint: 'qc-report.xlsx',
    label: 'QC report',
    fileName: 'qc-report.xlsx',
    helper: 'Agreement and comparison tables',
    imagePrompt:
      'flat app icon, quality control checklist with comparison table, red and blue accents, premium macOS dock style, realistic glossy png icon',
  },
  {
    endpoint: 'missing-data-report.xlsx',
    label: 'Missing-data report',
    fileName: 'missing-data-report.xlsx',
    helper: 'Missingness tables by RA and date',
    imagePrompt:
      'flat app icon, spreadsheet with highlighted empty cells, amber and white palette, premium macOS dock style, realistic glossy png icon',
  },
  {
    endpoint: 'exclusion-log.xlsx',
    label: 'Exclusion log',
    fileName: 'exclusion-log.xlsx',
    helper: 'Excluded records in table form',
    imagePrompt:
      'flat app icon, clinical logbook with exclusion stamp and clean rows, charcoal and gold accents, premium macOS dock style, realistic glossy png icon',
  },
  {
    endpoint: 'progress-report.xlsx',
    label: 'Progress report',
    fileName: 'progress-report.xlsx',
    helper: 'Study progress tables by status and RA',
    imagePrompt:
      'flat app icon, progress dashboard as simple table rows and totals, teal and white palette, premium macOS dock style, realistic glossy png icon',
  },
];

const satsCategoryOptions = [
  { value: '1', label: '1 Red' },
  { value: '2', label: '2 Orange' },
  { value: '3', label: '3 Yellow' },
  { value: '4', label: '4 Green' },
];

function buildIconUrl(prompt: string) {
  return `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
    prompt,
  )}&image_size=square`;
}

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
                <Image
                  src={buildIconUrl(item.imagePrompt)}
                  alt={item.label}
                  w={88}
                  h={88}
                  radius="lg"
                />
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
