import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssignmentOptions } from '../../api/assignments-api';
import { commitQcAssignments, previewQcAutoAssign } from '../../api/qc-api';
import { deleteRecord, listRecords } from '../../api/records-api';
import type { QcAssignResponse } from '../../api/types';
import { DeleteConfirmModal } from '../../components/delete-confirm-modal';
import { ListPageLayout } from '../../components/list-page-layout';
import { useAuth } from '../auth/use-auth';
import { satsCategoryOptions } from './record-decoders';
import { formatQcAssignmentSummary, qcAssignmentStatus, qcStatusFilterOptions } from './qc-status';

export function RecordsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const canAssignQc =
    session?.user.role === 'PI' || session?.user.role === 'SUPERADMIN';
  const [filters, setFilters] = useState({
    status: '',
    extractor_id: '',
    from: '',
    to: '',
    sats_cat: '',
    mode: '',
    qc_status: '',
  });
  const [draftFilters, setDraftFilters] = useState(filters);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [percentage, setPercentage] = useState<number | string>(10);
  const [productionOnly, setProductionOnly] = useState(true);
  const [assignmentPlan, setAssignmentPlan] = useState<QcAssignResponse | null>(null);
  const [confirmOpen, confirmHandlers] = useDisclosure(false);

  const { data, isLoading } = useQuery({
    queryKey: ['records', filters],
    queryFn: () =>
      listRecords({
        status: filters.status || undefined,
        extractor_id: filters.extractor_id || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        sats_cat: filters.sats_cat || undefined,
        mode: filters.mode || undefined,
        qc_status: filters.qc_status || undefined,
      }),
  });
  const optionsQuery = useQuery({
    queryKey: ['assignment-options-for-record-filters'],
    queryFn: getAssignmentOptions,
  });
  const previewMutation = useMutation({
    mutationFn: () => {
      const sample = typeof percentage === 'number' ? percentage : Number(percentage);
      if (!Number.isInteger(sample) || sample < 1 || sample > 100) {
        throw new Error('Choose a whole percentage from 1 to 100.');
      }

      return previewQcAutoAssign({
        percentage: sample,
        production_only: productionOnly,
      });
    },
    onSuccess: (plan) => {
      setAssignmentPlan(plan);
      confirmHandlers.open();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Could not prepare QC assignment',
        message: error.message,
      });
    },
  });
  const commitMutation = useMutation({
    mutationFn: () => commitQcAssignments(assignmentPlan?.assignments ?? []),
    onSuccess: async (result) => {
      notifications.show({
        color: 'green',
        title: 'Assigned to QC',
        message: `${result.assigned_count} records are now QC Required.`,
      });
      confirmHandlers.close();
      setAssignmentPlan(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['records'] }),
        queryClient.invalidateQueries({ queryKey: ['qc-queue'] }),
      ]);
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Could not assign to QC',
        message: error.message,
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      deleteRecord(id, { reason }),
    onSuccess: async () => {
      setDeleteTarget(null);
      setDeleteReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['records'] }),
        queryClient.invalidateQueries({ queryKey: ['superbin'] }),
      ]);
    },
  });

  const records = data?.data ?? [];
  const raNameById = new Map(
    (optionsQuery.data?.ras ?? []).map((user) => [user.id, user.full_name]),
  );

  return (
    <>
      <ListPageLayout
        title="Records"
        summaryItems={[
          { label: 'records', value: `${records.length}` },
          {
            label: 'synced',
            value: `${records.filter((row) => row.status === 'Synced').length}`,
          },
          {
            label: 'verified',
            value: `${records.filter((row) => row.status === 'Verified').length}`,
          },
          {
            label: 'locked',
            value: `${records.filter((row) => row.status === 'Locked').length}`,
          },
        ]}
        columns={[
          { key: 'studyId', label: 'Study ID' },
          { key: 'status', label: 'Status' },
          { key: 'qcStatus', label: 'QC status' },
          { key: 'mode', label: 'Mode' },
          { key: 'extractor', label: 'Research assistant' },
          { key: 'qcComment', label: 'QC comment' },
          { key: 'updatedAt', label: 'Last updated' },
          { key: 'actions', label: 'Actions' },
        ]}
        rows={records.map((record) => ({
          id: record._id,
          onClick: () => navigate(`/records/${record._id}`),
          values: {
            studyId: record.study_id,
            status: record.status,
            qcStatus: qcAssignmentStatus(record),
            mode: record.mode ?? 'Not set',
            extractor: record.extractor_id
              ? (raNameById.get(record.extractor_id) ?? record.extractor_id)
              : 'Not assigned',
            qcComment: record.data_quality?.qc_comment ?? 'No comment',
            updatedAt: record.updated_at
              ? new Date(record.updated_at).toLocaleString()
              : 'Not available',
            actions: (
              <Button
                size="sm"
                variant="outline"
                color="red"
                onClick={(event) => {
                  event.stopPropagation();
                  setDeleteTarget({ id: record._id, label: record.study_id });
                }}
              >
                Delete
              </Button>
            ),
          },
        }))}
        tableMinWidth={1480}
        emptyMessage={isLoading ? 'Loading records...' : 'No records matched these filters.'}
        filterSlot={
          <Stack gap="md">
            <Group align="end" wrap="wrap">
            <Select
              label="Status"
              placeholder="All"
              data={[
                'Draft',
                'Clinical Data Complete - Outcome Pending',
                'Complete',
                'Pending Sync',
                'Sync Failed',
                'Synced',
                'QC Required',
                'Returned for Correction',
                'Verified',
                'Locked',
                'Excluded',
              ]}
              value={draftFilters.status}
              onChange={(value) => setDraftFilters((current) => ({ ...current, status: value ?? '' }))}
            />
            <Select
              label="Research assistant"
              placeholder="Any RA"
              searchable
              data={(optionsQuery.data?.ras ?? []).map((user) => ({
                value: user.id,
                label: user.full_name,
              }))}
              value={draftFilters.extractor_id}
              onChange={(value) =>
                setDraftFilters((current) => ({ ...current, extractor_id: value ?? '' }))
              }
            />
            <TextInput
              label="From"
              type="date"
              value={draftFilters.from}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, from: event.currentTarget.value }))
              }
            />
            <TextInput
              label="To"
              type="date"
              value={draftFilters.to}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, to: event.currentTarget.value }))
              }
            />
            <Select
              label="SATS category"
              placeholder="Any"
              data={satsCategoryOptions}
              value={draftFilters.sats_cat}
              onChange={(value) => setDraftFilters((current) => ({ ...current, sats_cat: value ?? '' }))}
            />
            <Select
              label="Mode"
              placeholder="Any"
              data={['PILOT', 'TRAINING', 'PRODUCTION']}
              value={draftFilters.mode}
              onChange={(value) => setDraftFilters((current) => ({ ...current, mode: value ?? '' }))}
            />
            <Select
              label="QC status"
              placeholder="Any"
              data={qcStatusFilterOptions}
              value={draftFilters.qc_status}
              onChange={(value) =>
                setDraftFilters((current) => ({ ...current, qc_status: value ?? '' }))
              }
            />
              <Button onClick={() => setFilters(draftFilters)}>Apply filters</Button>
            </Group>
            {canAssignQc ? (
              <Group align="end" wrap="wrap">
              <NumberInput
                label="QC sample"
                description="Percent of eligible records"
                min={1}
                max={100}
                allowDecimal={false}
                value={percentage}
                onChange={setPercentage}
                w={180}
              />
              <Checkbox
                label="Production records only"
                description="Leaves out training and pilot records"
                checked={productionOnly}
                onChange={(event) => setProductionOnly(event.currentTarget.checked)}
                mb={6}
              />
              <Button
                color="yellow"
                loading={previewMutation.isPending}
                onClick={() => previewMutation.mutate()}
              >
                Auto-assign to QC
                </Button>
              </Group>
            ) : null}
          </Stack>
        }
      />
      <Modal
        opened={confirmOpen}
        onClose={() => {
          confirmHandlers.close();
          setAssignmentPlan(null);
        }}
        title="Auto-assign to QC"
      >
        <Stack gap="md">
          {(assignmentPlan?.assigned_count ?? 0) > 0 ? (
            <>
              <Text>
                {formatQcAssignmentSummary(
                  assignmentPlan?.assigned_count ?? 0,
                  assignmentPlan?.reviewer_count ?? 0,
                )}
              </Text>
              <Stack gap={4}>
                {assignmentPlan?.reviewers?.map((reviewer) => (
                  <Text key={reviewer.qc_user_id} size="sm" c="dimmed">
                    {reviewer.full_name}: {reviewer.assigned_count}
                  </Text>
                ))}
              </Stack>
            </>
          ) : (
            <Alert color="yellow" title="Nothing to assign">
              No eligible Complete or Synced records match this sample.
            </Alert>
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                confirmHandlers.close();
                setAssignmentPlan(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color="yellow"
              loading={commitMutation.isPending}
              disabled={(assignmentPlan?.assigned_count ?? 0) === 0}
              onClick={() => commitMutation.mutate()}
            >
              Confirm assignment
            </Button>
          </Group>
        </Stack>
      </Modal>
      <DeleteConfirmModal
        opened={deleteTarget !== null}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteReason('');
        }}
        title="Delete record"
        description={`This will move ${deleteTarget?.label ?? 'this record'} to the superbin first.`}
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
