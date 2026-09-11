import { Alert, Button, Paper, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authoriseReplacement } from '../../api/devices-api';
import { listUsers } from '../../api/users-api';

interface DeviceReplacementValues {
  user_id: string;
  device_id: string;
}

export function DeviceReplacementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  });
  const form = useForm<DeviceReplacementValues>({
    initialValues: {
      user_id: '',
      device_id: '',
    },
  });
  const mutation = useMutation({
    mutationFn: authoriseReplacement,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['devices'] });
      navigate('/devices');
    },
  });

  return (
    <Paper withBorder radius="md" p="xl" maw={720}>
      <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={2}>Authorise replacement device</Title>
            <Text c="dimmed">
              This adds or reauthorises a replacement device without deleting data from the older device.
            </Text>
          </Stack>
          {mutation.error ? (
            <Alert color="red" title="Could not authorise device">
              {mutation.error.message}
            </Alert>
          ) : null}
          <Select
            label="User"
            searchable
            data={(usersQuery.data?.data ?? []).map((user) => ({
              value: user.id,
              label: `${user.full_name} (${user.email})`,
            }))}
            {...form.getInputProps('user_id')}
          />
          <TextInput label="New device ID" {...form.getInputProps('device_id')} />
          <Button type="submit" loading={mutation.isPending}>
            Authorise device
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
