import { Button, Group, Select, TextInput } from '@mantine/core';
import {
  ListPageLayout,
  type SummaryItem,
  type TableColumn,
  type TableRow,
} from './list-page-layout';

interface ScaffoldListPageProps {
  title: string;
  summaryItems: SummaryItem[];
  columns: TableColumn[];
  rows: TableRow[];
}

export function ScaffoldListPage(props: ScaffoldListPageProps) {
  return (
    <ListPageLayout
      {...props}
      filterSlot={
        <Group align="end" wrap="wrap">
          <TextInput
            label="Search"
            placeholder="Type to search"
            size="md"
            styles={{ input: { minHeight: 44 } }}
          />
          <Select
            label="Status"
            placeholder="All"
            size="md"
            data={['All', 'Active', 'Pending', 'Complete']}
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
      }
    />
  );
}
