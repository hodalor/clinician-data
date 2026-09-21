import {
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  getInitialDestinationCodes,
  updateInitialDestinationCodes,
} from '../../api/study-configurations-api';
import type { StudyConfigurationValue } from '../../api/types';
import { ListPageLayout } from '../../components/list-page-layout';

export function InitialDestinationCodesPage() {
  const queryClient = useQueryClient();
  const [editorOpened, editorHandlers] = useDisclosure(false);
  const [draftCode, setDraftCode] = useState('');
  const [draftLabel, setDraftLabel] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['initial-destination-codes'],
    queryFn: getInitialDestinationCodes,
  });

  const [rowsDraft, setRowsDraft] = useState<StudyConfigurationValue[]>([]);

  useEffect(() => {
    if (!hasLocalChanges && data?.values) {
      setRowsDraft(data.values);
    }
  }, [data?.values, hasLocalChanges]);

  const values = useMemo(() => rowsDraft, [rowsDraft]);

  const saveMutation = useMutation({
    mutationFn: (nextValues: StudyConfigurationValue[]) =>
      updateInitialDestinationCodes(nextValues),
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: 'Destination codes saved',
        message: 'The immediate-destination list is up to date.',
      });
      setHasLocalChanges(false);
      setRowsDraft([]);
      await queryClient.invalidateQueries({
        queryKey: ['initial-destination-codes'],
      });
    },
  });

  function openAddModal() {
    setDraftCode('');
    setDraftLabel('');
    setEditingIndex(null);
    editorHandlers.open();
  }

  function openEditModal(index: number) {
    const target = values[index];
    setDraftCode(target?.code ?? '');
    setDraftLabel(target?.label ?? '');
    setEditingIndex(index);
    editorHandlers.open();
  }

  function upsertDraftRow() {
    const nextRow = {
      code: draftCode.trim(),
      label: draftLabel.trim(),
    };

    if (!nextRow.code || !nextRow.label) {
      return;
    }

    const nextValues = [...values];

    if (editingIndex === null) {
      nextValues.push(nextRow);
    } else {
      nextValues[editingIndex] = nextRow;
    }

    setHasLocalChanges(true);
    setRowsDraft(nextValues);
    editorHandlers.close();
  }

  function removeRow(index: number) {
    setHasLocalChanges(true);
    setRowsDraft(values.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <>
      <ListPageLayout
        title="Destination Codes"
        summaryItems={[
          { label: 'rows', value: `${values.length}` },
          {
            label: 'status',
            value: data?.pending_pi_approval ? 'Unconfirmed' : 'Confirmed',
          },
          {
            label: 'last update',
            value: data?.updated_at
              ? new Date(data.updated_at).toLocaleDateString()
              : 'Starter list',
          },
        ]}
        columns={[
          { key: 'code', label: 'Code' },
          { key: 'label', label: 'Label' },
          { key: 'actions', label: 'Actions' },
        ]}
        rows={values.map((entry, index) => ({
          id: `${entry.code}-${index}`,
          values: {
            code: entry.code,
            label: entry.label,
            actions: (
              <Group gap="xs">
                <Button
                  size="sm"
                  variant="light"
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditModal(index);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  color="red"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeRow(index);
                  }}
                >
                  Remove
                </Button>
              </Group>
            ),
          },
        }))}
        emptyMessage={isLoading ? 'Loading destination codes...' : 'No destination codes yet.'}
        filterSlot={
          <Stack gap="sm">
            {data?.pending_pi_approval ? (
              <Alert color="yellow" title="Unconfirmed — pending PI approval">
                This starter list was seeded so the mobile picker is not empty on day one.
                Review it, then save once it is confirmed.
              </Alert>
            ) : null}
            <Group justify="space-between" align="flex-end" wrap="wrap">
              <div>
                <Text fw={600}>Disposition list</Text>
                <Text size="sm" c="dimmed">
                  Mobile now reads this list from the backend. Manual entry is only used if
                  the list is genuinely empty.
                </Text>
                <Text size="sm" c="dimmed">
                  Last updated by {data?.updated_by_name ?? 'seed starter list'}.
                </Text>
              </div>
              <Group>
                <Button variant="default" onClick={openAddModal}>
                  Add row
                </Button>
                <Button
                  onClick={() => saveMutation.mutate(values)}
                  loading={saveMutation.isPending}
                >
                  Save list
                </Button>
              </Group>
            </Group>
          </Stack>
        }
      />

      <Modal
        opened={editorOpened}
        onClose={editorHandlers.close}
        title={editingIndex === null ? 'Add destination row' : 'Edit destination row'}
      >
        <Stack>
          <TextInput
            label="Code"
            placeholder="Resus"
            value={draftCode}
            onChange={(event) => setDraftCode(event.currentTarget.value)}
          />
          <TextInput
            label="Label"
            placeholder="Resus"
            value={draftLabel}
            onChange={(event) => setDraftLabel(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={editorHandlers.close}>
              Cancel
            </Button>
            <Button
              onClick={upsertDraftRow}
              disabled={draftCode.trim().length === 0 || draftLabel.trim().length === 0}
            >
              Save row
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
