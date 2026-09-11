import {
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getMissingnessReport, getProgressReport } from '../../api/export-api';

const chartColors = ['#1f2937', '#c19a49', '#5b8def', '#f97316', '#14b8a6'];

export function DashboardPage() {
  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['progress-report', {}],
    queryFn: () => getProgressReport({}),
  });

  const { data: missingnessData, isLoading: missingnessLoading } = useQuery({
    queryKey: ['missingness-report', {}],
    queryFn: () => getMissingnessReport({}),
  });

  const summary = progressData?.summary;
  const statusData = (progressData?.by_status ?? []).map((row, index) => ({
    name: row._id,
    value: row.count,
    fill: chartColors[index % chartColors.length],
  }));
  const modeData = (progressData?.by_mode ?? []).map((row) => ({
    name: row._id,
    records: row.count,
  }));
  const raProgressData = (progressData?.by_ra ?? []).map((row) => ({
    name: row.extractor_name ?? 'Unassigned',
    assigned: row.assigned,
    completed: row.completed,
    remaining: row.remaining,
  }));
  const missingnessTrendData = (missingnessData?.by_date_range ?? []).map(
    (row) => ({
      date: row.date,
      miss_vitals: row.miss_vitals,
      miss_outcome: row.miss_outcome,
      miss_sats: row.miss_sats,
    }),
  );

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={2} fw={600}>
          Dashboard
        </Title>
        <Group gap="lg">
          <SummaryStat label="total screened" value={summary?.total_screened ?? 0} />
          <SummaryStat label="eligible" value={summary?.eligible ?? 0} />
          <SummaryStat label="excluded" value={summary?.excluded ?? 0} />
          <SummaryStat label="abstracted" value={summary?.abstracted ?? 0} />
          <SummaryStat label="pending" value={summary?.pending ?? 0} />
          <SummaryStat label="synced" value={summary?.synced ?? 0} />
          <SummaryStat label="verified" value={summary?.verified ?? 0} />
          <SummaryStat label="locked" value={summary?.locked ?? 0} />
        </Group>
      </Stack>

      <Paper withBorder radius="md" p="md">
        <Stack gap="sm">
          <Text fw={600}>Progress by research assistant</Text>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Research assistant</Table.Th>
                <Table.Th>Assigned</Table.Th>
                <Table.Th>Completed</Table.Th>
                <Table.Th>Remaining</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {raProgressData.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text ta="center" py="lg" c="dimmed">
                      {progressLoading
                        ? 'Loading progress...'
                        : 'No progress rows yet.'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                raProgressData.map((row) => (
                  <Table.Tr key={row.name}>
                    <Table.Td>{row.name}</Table.Td>
                    <Table.Td>{row.assigned}</Table.Td>
                    <Table.Td>{row.completed}</Table.Td>
                    <Table.Td>{row.remaining}</Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Stack>
      </Paper>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <ChartCard
            title="Progress by research assistant"
            helper="Line view of assigned, completed, and remaining records."
            loading={progressLoading}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={raProgressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="assigned"
                  stroke={chartColors[0]}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke={chartColors[2]}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="remaining"
                  stroke={chartColors[3]}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        
          <ChartCard
            title="Record status mix"
            helper="Pie chart of the current study-wide status split."
            loading={progressLoading}
          >
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  fill={chartColors[0]}
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                />
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        
          <ChartCard
            title="Records by mode"
            helper="Bar chart comparing PILOT, TRAINING, and PRODUCTION volume."
            loading={progressLoading}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={modeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="records" fill={chartColors[1]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        
          <ChartCard
            title="Missingness over time"
            helper="Area view of missing vitals, SATS, and outcome by date."
            loading={missingnessLoading}
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={missingnessTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="miss_vitals"
                  stroke={chartColors[0]}
                  fill="#1f293722"
                />
                <Area
                  type="monotone"
                  dataKey="miss_sats"
                  stroke={chartColors[2]}
                  fill="#5b8def22"
                />
                <Area
                  type="monotone"
                  dataKey="miss_outcome"
                  stroke={chartColors[3]}
                  fill="#f9731622"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
      </SimpleGrid>
    </Stack>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <Text size="sm" c="dimmed">
      <Text component="span" inherit fw={600} c="dark">
        {value}
      </Text>{' '}
      {label}
    </Text>
  );
}

function ChartCard({
  title,
  helper,
  loading,
  children,
}: {
  title: string;
  helper: string;
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <Paper withBorder radius="md" p="md" h="100%">
      <Stack gap="xs" h="100%">
        <div>
          <Text fw={600}>{title}</Text>
          <Text size="sm" c="dimmed">
            {loading ? 'Loading chart...' : helper}
          </Text>
        </div>
        {children}
      </Stack>
    </Paper>
  );
}
