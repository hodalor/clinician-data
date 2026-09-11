import { Button, Group, Select, TextInput } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteUser, listUsers, updateUser } from '../../api/users-api';
import { DeleteConfirmModal } from '../../components/delete-confirm-modal';
import { ListPageLayout } from '../../components/list-page-layout';

export function UsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
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
  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      deleteUser(id, { reason }),
    onSuccess: async () => {
      setDeleteTarget(null);
      setDeleteReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['superbin'] }),
      ]);
    },
  });

  const users = data?.data ?? [];

  return (
    <>
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
          onClick: () => navigate(`/users/${user.id}/edit`),
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
                <Button
                  size="sm"
                  variant="outline"
                  color="red"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteTarget({ id: user.id, name: user.full_name });
                  }}
                >
                  Delete
                </Button>
                {user.status === 'active' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    color="red"
                    onClick={(event) => {
                      event.stopPropagation();
                      disableMutation.mutate(user.id);
                    }}
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
      <DeleteConfirmModal
        opened={deleteTarget !== null}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteReason('');
        }}
        title="Delete user"
        description={`This will move ${deleteTarget?.name ?? 'this user'} to the superbin first.`}
        reason={deleteReason}
        onReasonChange={setDeleteReason}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate({ id: deleteTarget.id, reason: deleteReason });
          }
        }}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
