import { Button, Group, Paper, Stack, Table, Tabs, Text, Title } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  listSuperbinItems,
  permanentlyDeleteSuperbinItem,
  restoreSuperbinItem,
  type SuperbinCollection,
} from '../../api/superbin-api';

const collections: Array<{ key: SuperbinCollection; label: string }> = [
  { key: 'users', label: 'Users' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'devices', label: 'Devices' },
  { key: 'records', label: 'Records' },
];

export function SuperbinPage() {
  const [activeTab, setActiveTab] = useState<SuperbinCollection>('users');
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['superbin', activeTab],
    queryFn: () => listSuperbinItems(activeTab),
  });

  const restoreMutation = useMutation({
    mutationFn: ({ collection, id }: { collection: SuperbinCollection; id: string }) =>
      restoreSuperbinItem(collection, id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['superbin'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['assignments'] }),
        queryClient.invalidateQueries({ queryKey: ['devices'] }),
        queryClient.invalidateQueries({ queryKey: ['records'] }),
      ]);
    },
  });
  const purgeMutation = useMutation({
    mutationFn: ({ collection, id }: { collection: SuperbinCollection; id: string }) =>
      permanentlyDeleteSuperbinItem(collection, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['superbin'] });
    },
  });

  const items = data?.data ?? [];

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={2}>Superbin</Title>
        <Text c="dimmed">
          The first delete moves items here. Only SUPERADMIN can restore or permanently remove them.
        </Text>
      </Stack>

      <Paper withBorder radius="md" p="md">
        <Tabs value={activeTab} onChange={(value) => setActiveTab((value as SuperbinCollection) ?? 'users')}>
          <Tabs.List>
            {collections.map((collection) => (
              <Tabs.Tab key={collection.key} value={collection.key}>
                {collection.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          {collections.map((collection) => (
            <Tabs.Panel key={collection.key} value={collection.key} pt="md">
              <Text size="sm" c="dimmed" mb="sm">
                Tip: scroll sideways if the table is wider than the screen.
              </Text>
              <div style={{ overflowX: 'auto' }}>
                <Table withTableBorder striped highlightOnHover style={{ minWidth: 980 }}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>TITLE</Table.Th>
                      <Table.Th>STATUS</Table.Th>
                      <Table.Th>DETAIL</Table.Th>
                      <Table.Th>DELETED AT</Table.Th>
                      <Table.Th>REASON</Table.Th>
                      <Table.Th>ACTIONS</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {collection.key !== activeTab ? null : items.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={6}>
                          <Text ta="center" py="lg" c="dimmed">
                            {isLoading ? 'Loading deleted items...' : 'Nothing is in this bin.'}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      items.map((item) => (
                        <Table.Tr key={item.id}>
                          <Table.Td>
                            <Text fw={700}>{item.title}</Text>
                            <Text size="sm" c="dimmed">
                              {item.subtitle}
                            </Text>
                          </Table.Td>
                          <Table.Td>{item.status}</Table.Td>
                          <Table.Td>{item.detail || 'Not available'}</Table.Td>
                          <Table.Td>
                            {item.deleted_at
                              ? new Date(item.deleted_at).toLocaleString()
                              : 'Not available'}
                          </Table.Td>
                          <Table.Td>{item.delete_reason ?? 'No reason'}</Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Button
                                size="xs"
                                variant="light"
                                onClick={() =>
                                  restoreMutation.mutate({
                                    collection: activeTab,
                                    id: item.id,
                                  })
                                }
                              >
                                Restore
                              </Button>
                              <Button
                                size="xs"
                                color="red"
                                variant="outline"
                                onClick={() =>
                                  purgeMutation.mutate({
                                    collection: activeTab,
                                    id: item.id,
                                  })
                                }
                              >
                                Delete forever
                              </Button>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </div>
            </Tabs.Panel>
          ))}
        </Tabs>
      </Paper>
    </Stack>
  );
}
