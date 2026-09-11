import { Button, Group, Paper, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  approveDeviceRequest,
  deleteDevice,
  deactivateDevice,
  listDeviceRequests,
  listDevices,
  rejectDeviceRequest,
} from '../../api/devices-api';
import { DeleteConfirmModal } from '../../components/delete-confirm-modal';
import { ListPageLayout } from '../../components/list-page-layout';

export function DevicesPage() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: listDevices,
  });
  const requestsQuery = useQuery({
    queryKey: ['device-requests', 'pending'],
    queryFn: () => listDeviceRequests('pending'),
    refetchInterval: 5000,
  });
  const deactivateMutation = useMutation({
    mutationFn: deactivateDevice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
  const approveMutation = useMutation({
    mutationFn: approveDeviceRequest,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['devices'] }),
        queryClient.invalidateQueries({ queryKey: ['device-requests'] }),
      ]);
    },
  });
  const rejectMutation = useMutation({
    mutationFn: rejectDeviceRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['device-requests'] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      deleteDevice(id, { reason }),
    onSuccess: async () => {
      setDeleteTarget(null);
      setDeleteReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['devices'] }),
        queryClient.invalidateQueries({ queryKey: ['superbin'] }),
      ]);
    },
  });

  const devices = data?.data ?? [];
  const pendingRequests = requestsQuery.data?.data ?? [];

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="md">
        <Stack gap="sm">
          <Stack gap={4}>
            <Title order={3}>Phone change requests</Title>
            <Text c="dimmed" size="sm">
              When a research assistant tries to sign in on a new phone, the request appears here automatically.
            </Text>
          </Stack>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Research assistant</Table.Th>
                <Table.Th>Requested time</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pendingRequests.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text ta="center" py="lg" c="dimmed">
                      {requestsQuery.isLoading
                        ? 'Loading requests...'
                        : 'No phone change requests are waiting right now.'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                pendingRequests.map((request) => (
                  <Table.Tr key={request.id}>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text fw={500}>{request.user_name}</Text>
                        <Text size="sm" c="dimmed">
                          {request.user_email ?? 'No email'}
                        </Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      {new Date(request.requested_at).toLocaleString()}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(request.id)}
                          loading={
                            approveMutation.isPending &&
                            approveMutation.variables === request.id
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          color="red"
                          onClick={() => rejectMutation.mutate(request.id)}
                          loading={
                            rejectMutation.isPending &&
                            rejectMutation.variables === request.id
                          }
                        >
                          Reject
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Stack>
      </Paper>

      <ListPageLayout
        title="Devices"
        summaryItems={[
          { label: 'devices', value: `${devices.length}` },
          { label: 'requests waiting', value: `${pendingRequests.length}` },
          {
            label: 'authorised',
            value: `${devices.filter((device) => device.authorised).length}`,
          },
          {
            label: 'deactivated',
            value: `${devices.filter((device) => !device.authorised).length}`,
          },
        ]}
        columns={[
          { key: 'deviceId', label: 'Device ID' },
          { key: 'user', label: 'User' },
          { key: 'authorised', label: 'Authorised' },
          { key: 'lastSeen', label: 'Last seen' },
          { key: 'actions', label: 'Actions' },
        ]}
        rows={devices.map((device, index) => ({
          id: device.id,
          values: {
            deviceId: (
              <Stack gap={2}>
                <Text fw={500}>{formatDeviceLabel(index)}</Text>
                <Text size="sm" c="dimmed">
                  {device.device_id}
                </Text>
              </Stack>
            ),
            user: device.user_name,
            authorised: device.authorised ? 'Yes' : 'No',
            lastSeen: device.last_seen_at
              ? new Date(device.last_seen_at).toLocaleString()
              : 'Never',
            actions: (
              <Group gap="xs">
                {device.authorised ? (
                  <Button
                    size="sm"
                    variant="outline"
                    color="red"
                    onClick={() => deactivateMutation.mutate(device.id)}
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Text size="sm" c="dimmed">
                    Inactive
                  </Text>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  color="red"
                  onClick={() =>
                    setDeleteTarget({
                      id: device.id,
                      label: formatDeviceLabel(index),
                    })
                  }
                >
                  Delete
                </Button>
              </Group>
            ),
          },
        }))}
        emptyMessage={isLoading ? 'Loading devices...' : 'No devices found.'}
        filterSlot={
          <Group align="end" wrap="wrap">
            <TextInput label="Search" placeholder="Search by device or user" />
            <Select label="Authorised" placeholder="All" data={['Yes', 'No']} />
          </Group>
        }
      />
      <DeleteConfirmModal
        opened={deleteTarget !== null}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteReason('');
        }}
        title="Delete device"
        description={`This will move ${deleteTarget?.label ?? 'this device'} to the superbin first.`}
        reason={deleteReason}
        onReasonChange={setDeleteReason}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate({ id: deleteTarget.id, reason: deleteReason });
          }
        }}
        loading={deleteMutation.isPending}
      />
    </Stack>
  );
}

function formatDeviceLabel(index: number) {
  return `D${String(index + 1).padStart(5, '0')}`;
}
