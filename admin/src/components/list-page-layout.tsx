import {
  Box,
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
  onClick?: () => void;
}

interface ListPageLayoutProps {
  title: string;
  summaryItems: SummaryItem[];
  columns: TableColumn[];
  rows: TableRow[];
  filterSlot?: ReactNode;
  emptyMessage?: string;
  tableMinWidth?: number;
}

export function ListPageLayout({
  title,
  summaryItems,
  columns,
  rows,
  filterSlot,
  emptyMessage = 'No rows to show yet.',
  tableMinWidth = 980,
}: ListPageLayoutProps) {
  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={2} fw={600}>
          {title}
        </Title>
        <Group gap="lg">
          {summaryItems.map((item) => (
            <Paper
              key={item.label}
              withBorder
              radius="md"
              px="md"
              py="sm"
              style={{
                minWidth: 120,
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,240,226,0.95))',
                borderColor: '#e4d3ab',
              }}
            >
              <Text size="xs" tt="uppercase" fw={700} c="#8b6b2c">
                {item.label}
              </Text>
              <Text fw={700} size="xl" c="#1b1b1b">
                {item.value}
              </Text>
            </Paper>
          ))}
        </Group>
      </Stack>

      <Paper
        withBorder
        radius="md"
        p="md"
        style={{
          background: 'rgba(255,255,255,0.95)',
          borderColor: '#e4d3ab',
          boxShadow: '0 20px 40px rgba(35, 24, 8, 0.05)',
        }}
      >
        {filterSlot ?? <DefaultFilterBar />}
      </Paper>

      <Paper
        withBorder
        radius="md"
        p={0}
        style={{
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.98)',
          borderColor: '#e4d3ab',
          boxShadow: '0 24px 60px rgba(24, 18, 8, 0.08)',
        }}
      >
        <Box style={{ overflowX: 'auto' }}>
        <Table
          striped
          highlightOnHover
          withTableBorder
          style={{ minWidth: tableMinWidth }}
        >
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
                <Table.Tr
                  key={row.id}
                  onClick={row.onClick}
                  style={
                    row.onClick
                      ? { cursor: 'pointer' }
                      : undefined
                  }
                >
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
        </Box>
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
