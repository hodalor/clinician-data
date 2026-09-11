import {
  Alert,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import * as authApi from '../../api/auth-api';
import type { LoginPayload } from '../../api/types';
import { defaultPathForRole } from '../../routes/permissions';
import { useAuth } from './use-auth';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, session } = useAuth();
  const form = useForm<LoginPayload>({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) =>
        value.trim().length === 0 ? 'Email is required.' : null,
      password: (value) =>
        value.trim().length === 0 ? 'Password is required.' : null,
    },
  });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (nextSession) => {
      navigate(defaultPathForRole(nextSession.user.role), { replace: true });
    },
  });

  if (isAuthenticated) {
    return <Navigate to={defaultPathForRole(session?.user.role)} replace />;
  }

  return (
    <Center mih="100vh" p="lg" bg="#f5f6f8">
      <Paper withBorder radius="md" p="xl" maw={420} w="100%">
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="lg">
            <Stack gap={4}>
              <Title order={2}>Sign in</Title>
              <Text c="dimmed" size="sm">
                Enter your study account email and password.
              </Text>
            </Stack>

            {mutation.error ? (
              <Alert color="red" title="Sign-in failed">
                {mutation.error.message}
              </Alert>
            ) : null}

            <TextInput
              label="Email"
              placeholder="name@example.com"
              size="md"
              styles={{ input: { minHeight: 46 } }}
              {...form.getInputProps('email')}
            />

            <PasswordInput
              label="Password"
              placeholder="Enter password"
              size="md"
              styles={{ input: { minHeight: 46 } }}
              {...form.getInputProps('password')}
            />

            <Button type="submit" size="md" loading={mutation.isPending}>
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
