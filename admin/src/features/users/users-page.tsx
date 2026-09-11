import { Button, Group, Select, TextInput } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listUsers, updateUser } from '../../api/users-api';
import { ListPageLayout } from '../../components/list-page-layout';

export function UsersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  });
  const disableMutation = useMutation({
    mutationFn: (id: string) =>
      updateUser(id, {
        email: (data?.data.find((user) => user.id === id)?.email ?? ''),
        role: (data?.data.find((user) => user.id === id)?.role ?? 'RA'),
        full_name: (data?.data.find((user) => user.id === id)?.full_name ?? ''),
        status: 'disabled',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const users = data?.data ?? [];

  return (
    <ListPageLayout
      title="Users"
      summaryItems={[
        { label: 'users', value: `${users.length}` },
        {
          label: 'active',
          value: `${users.filter((user) => user.status === 'active').length}`,
        },
        {
          label: 'disabled',
          value: `${users.filter((user) => user.status === 'disabled').length}`,
        },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'status', label: 'Status' },
        { key: 'actions', label: 'Actions' },
      ]}
      rows={users.map((user) => ({
        id: user.id,
        values: {
          name: user.full_name,
          email: user.email,
          role: user.role,
          status: user.status,
          actions: (
            <Group gap="xs">
              <Button component={Link} to={`/users/${user.id}/edit`} size="sm" variant="light">
                Edit
              </Button>
              {user.status === 'active' ? (
                <Button
                  size="sm"
                  variant="outline"
                  color="red"
                  onClick={() => disableMutation.mutate(user.id)}
                >
                  Disable
                </Button>
              ) : null}
            </Group>
          ),
        },
      }))}
      emptyMessage={isLoading ? 'Loading users...' : 'No users found.'}
      filterSlot={
        <Group align="end" wrap="wrap" justify="space-between">
          <Group align="end" wrap="wrap">
            <TextInput label="Search" placeholder="Search by name or email" />
            <Select
              label="Role"
              placeholder="All"
              data={['RA', 'QC', 'PI', 'ADMIN', 'SUPERADMIN']}
            />
            <Select label="Status" placeholder="All" data={['active', 'disabled']} />
          </Group>
          <Button component={Link} to="/users/new">
            Create user
          </Button>
        </Group>
      }
    />
  );
}
