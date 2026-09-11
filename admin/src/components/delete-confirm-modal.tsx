import { Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core';

interface DeleteConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  description: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteConfirmModal({
  opened,
  onClose,
  title,
  description,
  reason,
  onReasonChange,
  onConfirm,
  loading = false,
}: DeleteConfirmModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {description}
        </Text>
        <Textarea
          label="Reason for deletion"
          placeholder="Write a clear reason"
          minRows={4}
          value={reason}
          onChange={(event) => onReasonChange(event.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={onConfirm}
            loading={loading}
            disabled={reason.trim().length === 0}
          >
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
