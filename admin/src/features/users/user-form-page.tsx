import { Alert, Button, Paper, PasswordInput, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createUser, listUsers, updateUser } from '../../api/users-api';
import type { UserRole } from '../../api/types';

interface UserFormValues {
  email: string;
  password: string;
  role: UserRole;
  full_name: string;
  status: 'active' | 'disabled';
}

export function UserFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId } = useParams();
  const isEdit = Boolean(userId);
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  });
  const existingUser = usersQuery.data?.data.find((user) => user.id === userId);

  const form = useForm<UserFormValues>({
    initialValues: {
      email: '',
      password: '',
      role: 'RA',
      full_name: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (!existingUser) {
      return;
    }
    form.setValues({
      email: existingUser.email,
      password: '',
      role: existingUser.role,
      full_name: existingUser.full_name,
      status: existingUser.status,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingUser]);

  const mutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      if (isEdit) {
        return updateUser(userId!, {
          ...values,
          password: values.password || undefined,
        });
      }
      return createUser(values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate('/users');
    },
  });

  return (
    <Paper withBorder radius="md" p="xl" maw={720}>
      <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={2}>{isEdit ? 'Edit user' : 'Create user'}</Title>
            <Text c="dimmed">Use a short, plain form and keep role assignment explicit.</Text>
          </Stack>
          {mutation.error ? (
            <Alert color="red" title="Could not save user">
              {mutation.error.message}
            </Alert>
          ) : null}
          <TextInput label="Full name" {...form.getInputProps('full_name')} />
          <TextInput label="Email" {...form.getInputProps('email')} />
          <PasswordInput
            label={isEdit ? 'New password (optional)' : 'Password'}
            {...form.getInputProps('password')}
          />
          <Select
            label="Role"
            data={['RA', 'QC', 'PI', 'ADMIN', 'SUPERADMIN']}
            {...form.getInputProps('role')}
          />
          <Select
            label="Status"
            data={['active', 'disabled']}
            {...form.getInputProps('status')}
          />
          <Button type="submit" loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
