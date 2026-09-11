import { Button, Group, Select, TextInput } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { deactivateDevice, listDevices } from '../../api/devices-api';
import { ListPageLayout } from '../../components/list-page-layout';

export function DevicesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: listDevices,
  });
  const deactivateMutation = useMutation({
    mutationFn: deactivateDevice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const devices = data?.data ?? [];

  return (
    <ListPageLayout
      title="Devices"
      summaryItems={[
        { label: 'devices', value: `${devices.length}` },
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
      rows={devices.map((device) => ({
        id: device.id,
        values: {
          deviceId: device.device_id,
          user: device.user_name,
          authorised: device.authorised ? 'Yes' : 'No',
          lastSeen: device.last_seen_at
            ? new Date(device.last_seen_at).toLocaleString()
            : 'Never',
          actions: device.authorised ? (
            <Button
              size="sm"
              variant="outline"
              color="red"
              onClick={() => deactivateMutation.mutate(device.id)}
            >
              Deactivate
            </Button>
          ) : (
            'Inactive'
          ),
        },
      }))}
      emptyMessage={isLoading ? 'Loading devices...' : 'No devices found.'}
      filterSlot={
        <Group align="end" wrap="wrap" justify="space-between">
          <Group align="end" wrap="wrap">
            <TextInput label="Search" placeholder="Search by device or user" />
            <Select label="Authorised" placeholder="All" data={['Yes', 'No']} />
          </Group>
          <Button component={Link} to="/devices/replacement">
            Authorise replacement
          </Button>
        </Group>
      }
    />
  );
}
