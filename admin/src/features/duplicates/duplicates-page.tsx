import { Button, Group, Select, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listDuplicates, resolveDuplicate } from '../../api/qc-api';
import { ListPageLayout, type TableRow } from '../../components/list-page-layout';

export function DuplicatesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['duplicates'],
    queryFn: listDuplicates,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ recordId, matchedRecordId }: { recordId: string; matchedRecordId: string }) =>
      resolveDuplicate(recordId, matchedRecordId),
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: 'Duplicate resolved',
        message: 'The duplicate flag has been marked as resolved.',
      });
      await queryClient.invalidateQueries({ queryKey: ['duplicates'] });
    },
  });

  const rows: TableRow[] = (data?.data ?? []).flatMap((record) =>
    record.duplicate_flags.map((flag, index) => ({
      id: `${record.record_id}-${flag.matched_record_id ?? index}`,
      values: {
        studyId: record.study_id,
        matchedRecord: flag.matched_record_id ?? 'Unknown',
        basis: flag.basis.join(', '),
        status: flag.resolved ? 'Resolved' : 'Open',
        actions: flag.matched_record_id ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              resolveMutation.mutate({
                recordId: record.record_id,
                matchedRecordId: flag.matched_record_id!,
              })
            }
            loading={resolveMutation.isPending}
          >
            Resolve
          </Button>
        ) : (
          'No action'
        ),
      },
    })),
  );

  return (
    <ListPageLayout
      title="Duplicates"
      summaryItems={[
        { label: 'duplicate pairs', value: `${rows.length}` },
        {
          label: 'open',
          value: `${rows.filter((row) => row.values.status === 'Open').length}`,
        },
        {
          label: 'resolved',
          value: `${rows.filter((row) => row.values.status === 'Resolved').length}`,
        },
      ]}
      columns={[
        { key: 'studyId', label: 'Study ID' },
        { key: 'matchedRecord', label: 'Matched record' },
        { key: 'basis', label: 'Match basis' },
        { key: 'status', label: 'Status' },
        { key: 'actions', label: 'Actions' },
      ]}
      rows={rows}
      emptyMessage={isLoading ? 'Loading duplicates...' : 'No unresolved duplicates right now.'}
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
            data={['All', 'Open', 'Resolved']}
            size="md"
          />
          <TextInput
            label="Match basis"
            placeholder="Any basis"
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
