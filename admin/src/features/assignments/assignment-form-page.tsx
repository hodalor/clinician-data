import {
  Alert,
  Button,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createAssignment,
  getAssignmentDetail,
  getAssignmentOptions,
  updateAssignment,
} from '../../api/assignments-api';
import { useAuth } from '../auth/use-auth';

interface AssignmentFormValues {
  pi_id: string;
  ra_id: string;
  from: string;
  to: string;
  register_pages: string;
  file_ranges: string;
  status: string;
}

export function AssignmentFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { assignmentId } = useParams();
  const isEdit = Boolean(assignmentId);
  const { session } = useAuth();

  const optionsQuery = useQuery({
    queryKey: ['assignment-options'],
    queryFn: getAssignmentOptions,
  });
  const detailQuery = useQuery({
    queryKey: ['assignment-detail', assignmentId],
    queryFn: () => getAssignmentDetail(assignmentId!),
    enabled: isEdit,
  });

  const form = useForm<AssignmentFormValues>({
    initialValues: {
      pi_id: '',
      ra_id: '',
      from: '',
      to: '',
      register_pages: '',
      file_ranges: '',
      status: 'Active',
    },
    validate: {
      pi_id: (value) =>
        session?.user.role === 'ADMIN' && !value ? 'PI is required.' : null,
      ra_id: (value) => (!value ? 'Research assistant is required.' : null),
      from: (value) => (!value ? 'Start date is required.' : null),
      to: (value) => (!value ? 'End date is required.' : null),
      status: (value) => (!value ? 'Status is required.' : null),
    },
  });

  useEffect(() => {
    if (!isEdit || !detailQuery.data) {
      return;
    }

    const assignment = detailQuery.data.assignment;
    form.setValues({
      pi_id: assignment.pi_id,
      ra_id: assignment.ra_id,
      from: assignment.date_range.from.slice(0, 10),
      to: assignment.date_range.to.slice(0, 10),
      register_pages: assignment.register_pages.join(', '),
      file_ranges: assignment.file_ranges.join(', '),
      status: assignment.status,
    });
    // We only want to hydrate the form when the detail query first resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQuery.data, isEdit]);

  const mutation = useMutation({
    mutationFn: async (values: AssignmentFormValues) => {
      const payload = {
        pi_id: session?.user.role === 'ADMIN' ? values.pi_id : undefined,
        ra_id: values.ra_id,
        date_range: {
          from: values.from,
          to: values.to,
        },
        register_pages: splitCsv(values.register_pages),
        file_ranges: splitCsv(values.file_ranges),
        status: values.status,
      };

      if (isEdit) {
        return updateAssignment(assignmentId!, payload);
      }

      return createAssignment(payload);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
      navigate(`/assignments/${response.assignment.id}`);
    },
  });

  return (
    <Paper withBorder radius="md" p="xl" maw={760}>
      <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={2}>{isEdit ? 'Edit assignment' : 'Create assignment'}</Title>
            <Text c="dimmed">
              Keep this form simple: one RA, one date range, one status.
            </Text>
          </Stack>

          {mutation.error ? (
            <Alert color="red" title="Could not save assignment">
              {mutation.error.message}
            </Alert>
          ) : null}

          {session?.user.role === 'ADMIN' ? (
            <Select
              label="Principal investigator"
              placeholder="Choose PI"
              data={(optionsQuery.data?.pis ?? []).map((pi) => ({
                value: pi.id,
                label: `${pi.full_name} (${pi.email})`,
              }))}
              searchable
              size="md"
              {...form.getInputProps('pi_id')}
            />
          ) : null}

          <Select
            label="Research assistant"
            placeholder="Choose RA"
            data={(optionsQuery.data?.ras ?? []).map((ra) => ({
              value: ra.id,
              label: `${ra.full_name} (${ra.email})`,
            }))}
            searchable
            size="md"
            {...form.getInputProps('ra_id')}
          />

          <TextInput
            label="Start date"
            type="date"
            size="md"
            {...form.getInputProps('from')}
          />

          <TextInput
            label="End date"
            type="date"
            size="md"
            {...form.getInputProps('to')}
          />

          <TextInput
            label="Register pages"
            placeholder="Example: Page 12, Page 13"
            size="md"
            {...form.getInputProps('register_pages')}
          />

          <TextInput
            label="File ranges"
            placeholder="Example: A01-A20, B01-B10"
            size="md"
            {...form.getInputProps('file_ranges')}
          />

          <Select
            label="Status"
            data={['Active', 'Paused', 'Closed']}
            size="md"
            {...form.getInputProps('status')}
          />

          <Button type="submit" size="md" loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create assignment'}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}

function splitCsv(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}
