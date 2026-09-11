import {
  Button,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import type { ReactNode } from 'react';

export interface SummaryItem {
  label: string;
  value: string;
}

export interface TableColumn {
  key: string;
  label: string;
}

export interface TableRow {
  id: string;
  values: Record<string, ReactNode>;
}

interface ListPageLayoutProps {
  title: string;
  summaryItems: SummaryItem[];
  columns: TableColumn[];
  rows: TableRow[];
  filterSlot?: ReactNode;
  emptyMessage?: string;
}

export function ListPageLayout({
  title,
  summaryItems,
  columns,
  rows,
  filterSlot,
  emptyMessage = 'No rows to show yet.',
}: ListPageLayoutProps) {
  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={2} fw={600}>
          {title}
        </Title>
        <Group gap="lg">
          {summaryItems.map((item) => (
            <Text key={item.label} size="sm" c="dimmed">
              <Text component="span" inherit fw={600} c="dark">
                {item.value}
              </Text>{' '}
              {item.label}
            </Text>
          ))}
        </Group>
      </Stack>

      <Paper withBorder radius="md" p="md">
        {filterSlot ?? <DefaultFilterBar />}
      </Paper>

      <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              {columns.map((column) => (
                <Table.Th key={column.key}>{column.label}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Text ta="center" py="lg" c="dimmed">
                    {emptyMessage}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              rows.map((row) => (
                <Table.Tr key={row.id}>
                  {columns.map((column) => (
                    <Table.Td key={`${row.id}-${column.key}`}>
                      {row.values[column.key]}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}

function DefaultFilterBar() {
  return (
    <Group align="end" wrap="wrap">
      <TextInput
        label="Search"
        placeholder="Search"
        size="md"
        styles={{ input: { minHeight: 44 } }}
      />
      <TextInput
        label="Status"
        placeholder="All"
        size="md"
        styles={{ input: { minHeight: 44 } }}
      />
      <TextInput
        label="Date range"
        placeholder="Any date"
        size="md"
        styles={{ input: { minHeight: 44 } }}
      />
      <Button size="md">Apply filters</Button>
    </Group>
  );
}
