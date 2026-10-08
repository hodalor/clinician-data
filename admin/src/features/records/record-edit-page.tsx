import {
  Alert,
  Button,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getRecord, updateRecord, upsertRecordOutcome } from '../../api/records-api';
import { getInitialDestinationCodes } from '../../api/study-configurations-api';
import type { RecordListItem } from '../../api/types';
import { recordFieldOptions } from './record-decoders';

const steps = [
  { id: 'eligibility', title: 'Eligibility' },
  { id: 'patient', title: 'Patient' },
  { id: 'sats', title: 'SATS / TEWS' },
  { id: 'physiology', title: 'Physiology' },
  { id: 'presentation', title: 'Presentation' },
  { id: 'destination', title: 'Disposition' },
  { id: 'process', title: 'Process' },
  { id: 'outcome', title: 'Outcome' },
  { id: 'review', title: 'Review & save' },
] as const;

type RecordEditDraft = {
  study_id: string;
  ed_date: string;
  ed_time: string;
  triage_time: string;
  triaged_by: string;
  age: string;
  eligible: string;
  exclusion_code: string;
  exclusion_reason: string;
  sex: string;
  referral: string;
  referring_health_center: string;
  referring_health_center_other: string;
  referral_date: string;
  referral_time: string;
  referred_by: string;
  lmuth_called: string;
  dm: string;
  htn: string;
  asthma: string;
  epilepsy: string;
  rvd: string;
  other_comorb: string;
  other_comorb_text: string;
  comorb_any: string;
  preg_test: string;
  sats_cat: string;
  tews_total: string;
  discriminator_yes: string;
  discriminator_type: string;
  discriminator_detail: string;
  documentation_complete: string;
  temp: string;
  hr: string;
  rr: string;
  sbp: string;
  dbp: string;
  spo2: string;
  rbs: string;
  mobility: string;
  avpu: string;
  trauma: string;
  chief_complaint_verbatim: string;
  complaint_group: string;
  multiple_complaints: string;
  multiple_complaints_details: string;
  initial_destination: string;
  clinician_time: string;
  treatment_time: string;
  doctor_review_datetime: string;
  doctor_diagnosis: string;
  system_diagnosis: string;
  doctor_review_disposition: string;
  outcome24: string;
  outcome_datetime: string;
  outcome_source: string;
  final_outcome: string;
  final_outcome_date: string;
};

const emptyDraft: RecordEditDraft = {
  study_id: '',
  ed_date: '',
  ed_time: '',
  triage_time: '',
  triaged_by: '',
  age: '',
  eligible: '',
  exclusion_code: '',
  exclusion_reason: '',
  sex: '',
  referral: '',
  referring_health_center: '',
  referring_health_center_other: '',
  referral_date: '',
  referral_time: '',
  referred_by: '',
  lmuth_called: '',
  dm: '',
  htn: '',
  asthma: '',
  epilepsy: '',
  rvd: '',
  other_comorb: '',
  other_comorb_text: '',
  comorb_any: '',
  preg_test: '',
  sats_cat: '',
  tews_total: '',
  discriminator_yes: '',
  discriminator_type: '',
  discriminator_detail: '',
  documentation_complete: '',
  temp: '',
  hr: '',
  rr: '',
  sbp: '',
  dbp: '',
  spo2: '',
  rbs: '',
  mobility: '',
  avpu: '',
  trauma: '',
  chief_complaint_verbatim: '',
  complaint_group: '',
  multiple_complaints: '',
  multiple_complaints_details: '',
  initial_destination: '',
  clinician_time: '',
  treatment_time: '',
  doctor_review_datetime: '',
  doctor_diagnosis: '',
  system_diagnosis: '',
  doctor_review_disposition: '',
  outcome24: '',
  outcome_datetime: '',
  outcome_source: '',
  final_outcome: '',
  final_outcome_date: '',
};

const yesNoOptions = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

export function RecordEditPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { recordId } = useParams();
  const [draft, setDraft] = useState<RecordEditDraft>(emptyDraft);
  const [stepIndex, setStepIndex] = useState(0);

  const recordQuery = useQuery({
    queryKey: ['record-detail', recordId],
    queryFn: () => getRecord(recordId!),
    enabled: Boolean(recordId),
  });
  const destinationsQuery = useQuery({
    queryKey: ['initial-destination-codes'],
    queryFn: getInitialDestinationCodes,
  });

  const record = recordQuery.data?.record;
  const isLocked = record?.status === 'Locked' || record?.status === 'Verified';

  useEffect(() => {
    if (record) {
      setDraft(buildDraftFromRecord(record));
    }
  }, [record]);

  const visibleSteps = useMemo(
    () =>
      draft.eligible === 'false'
        ? steps.filter((step) => step.id === 'eligibility' || step.id === 'review')
        : [...steps],
    [draft.eligible],
  );
  const currentStep = visibleSteps[Math.min(stepIndex, visibleSteps.length - 1)]!;
  const sectionCount = visibleSteps.length - 1;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const recordPayload = buildRecordUpdatePayload(draft);
      const outcomePayload = buildOutcomePayload(draft);

      if (hasPartialOutcome(draft)) {
        throw new Error(
          'When outcome is entered, the 24-hour outcome and source are required.',
        );
      }

      const result = await updateRecord(recordId!, recordPayload);

      if (outcomePayload) {
        await upsertRecordOutcome(recordId!, outcomePayload);
      }

      return result;
    },
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: 'Record updated',
        message: 'The existing record was updated successfully.',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['record-detail', recordId] }),
        queryClient.invalidateQueries({ queryKey: ['record-audit', recordId] }),
        queryClient.invalidateQueries({ queryKey: ['records'] }),
      ]);
      navigate(`/records/${recordId}`);
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Could not update record',
        message: error.message,
      });
    },
  });

  function update(patch: Partial<RecordEditDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function goNext() {
    if (currentStep.id === 'eligibility' && draft.study_id.trim().length === 0) {
      notifications.show({
        color: 'red',
        title: 'Study ID is required',
        message: 'Enter the study ID before continuing.',
      });
      return;
    }

    if (
      currentStep.id === 'eligibility' &&
      draft.eligible === 'false' &&
      draft.exclusion_code.trim().length === 0
    ) {
      notifications.show({
        color: 'red',
        title: 'Exclusion reason is required',
        message: 'Choose why this patient was excluded.',
      });
      return;
    }

    setStepIndex((current) => Math.min(current + 1, visibleSteps.length - 1));
  }

  if (recordQuery.isLoading) {
    return <Text c="dimmed">Loading record editor...</Text>;
  }

  if (recordQuery.error) {
    return (
      <Alert color="red" title="Could not load record editor">
        {recordQuery.error.message}
      </Alert>
    );
  }

  if (!record) {
    return (
      <Alert color="red" title="Record not found">
        The selected record could not be loaded.
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <Paper
        withBorder
        radius="xl"
        p="xl"
        style={{
          background:
            'linear-gradient(135deg, rgba(27,20,10,0.96), rgba(58,43,17,0.96))',
          borderColor: '#e3c88b',
          color: '#fff7e6',
        }}
      >
        <Group justify="space-between" align="flex-start">
          <Stack gap="xs">
            <Title order={2} c="#fff7e6">
              Edit record
            </Title>
            <Text c="#f2dfb8">
              {currentStep.id === 'review'
                ? 'Review and save your edits'
                : `Section ${stepIndex + 1} of ${sectionCount}: ${currentStep.title}`}
            </Text>
            <Text c="#f2dfb8">
              Study ID {record.study_id} • Status {record.status}
            </Text>
          </Stack>
          <Group gap="sm">
            <Button component={Link} to={`/records/${recordId}`} variant="white" color="dark">
              Cancel
            </Button>
          </Group>
        </Group>
      </Paper>

      {isLocked ? (
        <Alert color="yellow" title="Editing is blocked">
          Verified and locked records cannot be edited from this form. Reopen the record first if
          it needs changes.
        </Alert>
      ) : null}

      <Paper withBorder radius="md" p="lg">
        <Stack gap="md">
          <Stack gap={4}>
            <Title order={3}>Record editor</Title>
            <Text c="dimmed">
              This updates the current record in place. It does not create a new record.
            </Text>
          </Stack>

          {currentStep.id === 'eligibility' ? (
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <TextInput
                label="Study ID"
                value={draft.study_id}
                onChange={(event) => update({ study_id: event.currentTarget.value })}
              />
              <TextInput
                label="ED presentation date"
                type="date"
                value={draft.ed_date}
                onChange={(event) => update({ ed_date: event.currentTarget.value })}
              />
              <TextInput
                label="ED presentation time"
                type="time"
                value={draft.ed_time}
                onChange={(event) => update({ ed_time: event.currentTarget.value })}
              />
              <TextInput
                label="Triage time"
                type="time"
                value={draft.triage_time}
                onChange={(event) => update({ triage_time: event.currentTarget.value })}
              />
              <Select
                label="Triaged by"
                data={recordFieldOptions('eligibility.triaged_by')}
                value={draft.triaged_by || null}
                onChange={(value) => update({ triaged_by: value ?? '' })}
                clearable
              />
              <TextInput
                label="Age in years"
                value={draft.age}
                onChange={(event) => update({ age: event.currentTarget.value })}
              />
              <Select
                label="Was this patient eligible?"
                data={yesNoOptions}
                value={draft.eligible || null}
                onChange={(value) =>
                  update({
                    eligible: value ?? '',
                    exclusion_code: value === 'true' ? '' : draft.exclusion_code,
                    exclusion_reason: value === 'true' ? '' : draft.exclusion_reason,
                  })
                }
                clearable
              />
              {draft.eligible === 'false' ? (
                <Select
                  label="Why was this patient excluded?"
                  data={recordFieldOptions('eligibility.exclusion_code')}
                  value={draft.exclusion_code || null}
                  onChange={(value) => update({ exclusion_code: value ?? '' })}
                  clearable
                />
              ) : null}
              {draft.eligible === 'false' && draft.exclusion_code === '9' ? (
                <TextInput
                  label="Other exclusion detail"
                  value={draft.exclusion_reason}
                  onChange={(event) => update({ exclusion_reason: event.currentTarget.value })}
                />
              ) : null}
            </SimpleGrid>
          ) : null}

          {currentStep.id === 'patient' ? (
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Select
                label="Sex"
                data={recordFieldOptions('patient.sex')}
                value={draft.sex || null}
                onChange={(value) =>
                  update({
                    sex: value ?? '',
                    preg_test: value === '1' ? '' : draft.preg_test,
                  })
                }
                clearable
              />
              <Select
                label="Referral status"
                data={recordFieldOptions('patient.referral')}
                value={draft.referral || null}
                onChange={(value) => update({ referral: value ?? '' })}
                clearable
              />
              {draft.referral === '1' ? (
                <TextInput
                  label="Health center patient is coming from"
                  value={draft.referring_health_center}
                  onChange={(event) =>
                    update({ referring_health_center: event.currentTarget.value })
                  }
                />
              ) : null}
              {draft.referral === '1' ? (
                <TextInput
                  label="Other health center detail"
                  value={draft.referring_health_center_other}
                  onChange={(event) =>
                    update({ referring_health_center_other: event.currentTarget.value })
                  }
                />
              ) : null}
              {draft.referral === '1' ? (
                <TextInput
                  label="Referral date"
                  type="date"
                  value={draft.referral_date}
                  onChange={(event) => update({ referral_date: event.currentTarget.value })}
                />
              ) : null}
              {draft.referral === '1' ? (
                <TextInput
                  label="Referral time"
                  type="time"
                  value={draft.referral_time}
                  onChange={(event) => update({ referral_time: event.currentTarget.value })}
                />
              ) : null}
              {draft.referral === '1' ? (
                <Select
                  label="Referred by"
                  data={recordFieldOptions('patient.referred_by')}
                  value={draft.referred_by || null}
                  onChange={(value) => update({ referred_by: value ?? '' })}
                  clearable
                />
              ) : null}
              <Select
                label="Was LMUTH called?"
                data={recordFieldOptions('patient.lmuth_called')}
                value={draft.lmuth_called || null}
                onChange={(value) => update({ lmuth_called: value ?? '' })}
                clearable
              />
              <Select
                label="Diabetes mellitus"
                data={recordFieldOptions('patient.comorbidities.dm')}
                value={draft.dm || null}
                onChange={(value) => update({ dm: value ?? '' })}
                clearable
              />
              <Select
                label="Hypertension"
                data={recordFieldOptions('patient.comorbidities.htn')}
                value={draft.htn || null}
                onChange={(value) => update({ htn: value ?? '' })}
                clearable
              />
              <Select
                label="Asthma"
                data={recordFieldOptions('patient.comorbidities.asthma')}
                value={draft.asthma || null}
                onChange={(value) => update({ asthma: value ?? '' })}
                clearable
              />
              <Select
                label="Epilepsy"
                data={recordFieldOptions('patient.comorbidities.epilepsy')}
                value={draft.epilepsy || null}
                onChange={(value) => update({ epilepsy: value ?? '' })}
                clearable
              />
              <Select
                label="HIV"
                data={recordFieldOptions('patient.comorbidities.rvd')}
                value={draft.rvd || null}
                onChange={(value) => update({ rvd: value ?? '' })}
                clearable
              />
              <Select
                label="Other comorbidity"
                data={recordFieldOptions('patient.comorbidities.other')}
                value={draft.other_comorb || null}
                onChange={(value) => update({ other_comorb: value ?? '' })}
                clearable
              />
              {draft.other_comorb === '1' ? (
                <TextInput
                  label="Other comorbidity detail"
                  value={draft.other_comorb_text}
                  onChange={(event) => update({ other_comorb_text: event.currentTarget.value })}
                />
              ) : null}
              <Select
                label="Any comorbidity"
                data={recordFieldOptions('patient.comorb_any')}
                value={draft.comorb_any || null}
                onChange={(value) => update({ comorb_any: value ?? '' })}
                clearable
              />
              {draft.sex !== '1' ? (
                <Select
                  label="Pregnancy test"
                  data={recordFieldOptions('patient.preg_test')}
                  value={draft.preg_test || null}
                  onChange={(value) => update({ preg_test: value ?? '' })}
                  clearable
                />
              ) : null}
            </SimpleGrid>
          ) : null}

          {currentStep.id === 'sats' ? (
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Select
                label="SATS category"
                data={recordFieldOptions('sats.sats_cat')}
                value={draft.sats_cat || null}
                onChange={(value) => update({ sats_cat: value ?? '' })}
                clearable
              />
              <TextInput
                label="TEWS total"
                value={draft.tews_total}
                onChange={(event) => update({ tews_total: event.currentTarget.value })}
              />
              <Select
                label="Discriminator documented"
                data={yesNoOptions}
                value={draft.discriminator_yes || null}
                onChange={(value) =>
                  update({
                    discriminator_yes: value ?? '',
                    discriminator_type: value === 'true' ? draft.discriminator_type : '',
                  })
                }
                clearable
              />
              {draft.discriminator_yes === 'true' ? (
                <Select
                  label="Discriminator type"
                  data={recordFieldOptions('sats.discriminator_type')}
                  value={draft.discriminator_type || null}
                  onChange={(value) => update({ discriminator_type: value ?? '' })}
                  clearable
                />
              ) : null}
              {draft.discriminator_yes === 'true' && draft.discriminator_type === '18' ? (
                <TextInput
                  label="Other documented discriminator"
                  value={draft.discriminator_detail}
                  onChange={(event) =>
                    update({ discriminator_detail: event.currentTarget.value })
                  }
                />
              ) : null}
              <Select
                label="SATS complete"
                data={yesNoOptions}
                value={draft.documentation_complete || null}
                onChange={(value) => update({ documentation_complete: value ?? '' })}
                clearable
              />
            </SimpleGrid>
          ) : null}

          {currentStep.id === 'physiology' ? (
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <TextInput
                label="Temperature"
                value={draft.temp}
                onChange={(event) => update({ temp: event.currentTarget.value })}
              />
              <TextInput
                label="Heart rate"
                value={draft.hr}
                onChange={(event) => update({ hr: event.currentTarget.value })}
              />
              <TextInput
                label="Respiratory rate"
                value={draft.rr}
                onChange={(event) => update({ rr: event.currentTarget.value })}
              />
              <TextInput
                label="Systolic blood pressure"
                value={draft.sbp}
                onChange={(event) => update({ sbp: event.currentTarget.value })}
              />
              <TextInput
                label="Diastolic blood pressure"
                value={draft.dbp}
                onChange={(event) => update({ dbp: event.currentTarget.value })}
              />
              <TextInput
                label="SpO2"
                value={draft.spo2}
                onChange={(event) => update({ spo2: event.currentTarget.value })}
              />
              <TextInput
                label="RBS"
                value={draft.rbs}
                onChange={(event) => update({ rbs: event.currentTarget.value })}
              />
              <Select
                label="Mobility"
                data={recordFieldOptions('physiology.mobility')}
                value={draft.mobility || null}
                onChange={(value) => update({ mobility: value ?? '' })}
                clearable
              />
              <Select
                label="AVPU"
                data={recordFieldOptions('physiology.avpu')}
                value={draft.avpu || null}
                onChange={(value) => update({ avpu: value ?? '' })}
                clearable
              />
              <Select
                label="Trauma"
                data={recordFieldOptions('physiology.trauma')}
                value={draft.trauma || null}
                onChange={(value) => update({ trauma: value ?? '' })}
                clearable
              />
            </SimpleGrid>
          ) : null}

          {currentStep.id === 'presentation' ? (
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <TextInput
                label="Chief complaint"
                value={draft.chief_complaint_verbatim}
                onChange={(event) =>
                  update({ chief_complaint_verbatim: event.currentTarget.value })
                }
              />
              <Select
                label="Complaint group"
                data={recordFieldOptions('presentation.complaint_group')}
                value={draft.complaint_group || null}
                onChange={(value) => update({ complaint_group: value ?? '' })}
                clearable
              />
              <Select
                label="Multiple complaints"
                data={yesNoOptions}
                value={draft.multiple_complaints || null}
                onChange={(value) => update({ multiple_complaints: value ?? '' })}
                clearable
              />
              {draft.multiple_complaints === 'true' ? (
                <TextInput
                  label="Additional complaints detail"
                  value={draft.multiple_complaints_details}
                  onChange={(event) =>
                    update({ multiple_complaints_details: event.currentTarget.value })
                  }
                />
              ) : null}
            </SimpleGrid>
          ) : null}

          {currentStep.id === 'destination' ? (
            <Select
              label="Disposition"
              placeholder="Choose an approved destination"
              data={(destinationsQuery.data?.values ?? []).map((item) => ({
                value: item.code,
                label: item.label ? `${item.code} ${item.label}` : item.code,
              }))}
              value={draft.initial_destination || null}
              onChange={(value) => update({ initial_destination: value ?? '' })}
              searchable
              clearable
            />
          ) : null}

          {currentStep.id === 'process' ? (
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <TextInput
                label="Time LMUTH was called by the referring facility"
                type="time"
                value={draft.clinician_time}
                onChange={(event) => update({ clinician_time: event.currentTarget.value })}
              />
              <TextInput
                label="Time treatment was initiated at LMUTH"
                type="time"
                value={draft.treatment_time}
                onChange={(event) => update({ treatment_time: event.currentTarget.value })}
              />
              <TextInput
                label="Doctor review date and time"
                type="datetime-local"
                value={draft.doctor_review_datetime}
                onChange={(event) =>
                  update({ doctor_review_datetime: event.currentTarget.value })
                }
              />
              <TextInput
                label="Doctor diagnosis"
                value={draft.doctor_diagnosis}
                onChange={(event) => update({ doctor_diagnosis: event.currentTarget.value })}
              />
              <Select
                label="System diagnosis"
                data={recordFieldOptions('process.system_diagnosis')}
                value={draft.system_diagnosis || null}
                onChange={(value) => update({ system_diagnosis: value ?? '' })}
                clearable
              />
              <TextInput
                label="Doctor review disposition"
                value={draft.doctor_review_disposition}
                onChange={(event) =>
                  update({ doctor_review_disposition: event.currentTarget.value })
                }
              />
            </SimpleGrid>
          ) : null}

          {currentStep.id === 'outcome' ? (
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Select
                label="24-hour outcome"
                data={recordFieldOptions('outcome24')}
                value={draft.outcome24 || null}
                onChange={(value) => update({ outcome24: value ?? '' })}
                clearable
              />
              <TextInput
                label="Outcome date and time"
                type="datetime-local"
                value={draft.outcome_datetime}
                onChange={(event) => update({ outcome_datetime: event.currentTarget.value })}
              />
              <Select
                label="Outcome source"
                data={recordFieldOptions('outcome_source')}
                value={draft.outcome_source || null}
                onChange={(value) => update({ outcome_source: value ?? '' })}
                clearable
              />
              <Select
                label="Final outcome"
                data={recordFieldOptions('outcome.final_outcome')}
                value={draft.final_outcome || null}
                onChange={(value) => update({ final_outcome: value ?? '' })}
                clearable
              />
              <TextInput
                label="Final outcome date"
                type="date"
                value={draft.final_outcome_date}
                onChange={(event) => update({ final_outcome_date: event.currentTarget.value })}
              />
            </SimpleGrid>
          ) : null}

          {currentStep.id === 'review' ? (
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                Review your changes before saving. This will update the same record.
              </Text>
              {summarizeDraft(draft).map((line) => (
                <Text key={line.label} size="sm">
                  <strong>{line.label}:</strong> {line.value}
                </Text>
              ))}
            </Stack>
          ) : null}

          <Group justify="space-between">
            <Button
              variant="default"
              onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
              disabled={stepIndex === 0}
            >
              Back
            </Button>
            {currentStep.id === 'review' ? (
              <Button
                color="yellow"
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                disabled={isLocked}
              >
                Save changes
              </Button>
            ) : (
              <Button color="yellow" onClick={goNext}>
                Next
              </Button>
            )}
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}

function buildDraftFromRecord(record: RecordListItem): RecordEditDraft {
  return {
    study_id: record.study_id ?? '',
    ed_date: formatDateInput(getNestedValue(record, 'eligibility.ed_date')),
    ed_time: formatTimeInput(getNestedValue(record, 'eligibility.ed_time')),
    triage_time: formatTimeInput(getNestedValue(record, 'eligibility.triage_time')),
    triaged_by: valueToString(getNestedValue(record, 'eligibility.triaged_by')),
    age: valueToString(getNestedValue(record, 'eligibility.age')),
    eligible: formatBooleanSelect(getNestedValue(record, 'eligibility.eligible')),
    exclusion_code: valueToString(getNestedValue(record, 'eligibility.exclusion_code')),
    exclusion_reason: valueToString(getNestedValue(record, 'eligibility.exclusion_reason')),
    sex: valueToString(getNestedValue(record, 'patient.sex')),
    referral: valueToString(getNestedValue(record, 'patient.referral')),
    referring_health_center: valueToString(
      getNestedValue(record, 'patient.referring_health_center'),
    ),
    referring_health_center_other: valueToString(
      getNestedValue(record, 'patient.referring_health_center_other'),
    ),
    referral_date: formatDateInput(getNestedValue(record, 'patient.referral_date')),
    referral_time: formatTimeInput(getNestedValue(record, 'patient.referral_time')),
    referred_by: valueToString(getNestedValue(record, 'patient.referred_by')),
    lmuth_called: valueToString(getNestedValue(record, 'patient.lmuth_called')),
    dm: valueToString(getNestedValue(record, 'patient.comorbidities.dm')),
    htn: valueToString(getNestedValue(record, 'patient.comorbidities.htn')),
    asthma: valueToString(getNestedValue(record, 'patient.comorbidities.asthma')),
    epilepsy: valueToString(getNestedValue(record, 'patient.comorbidities.epilepsy')),
    rvd: valueToString(getNestedValue(record, 'patient.comorbidities.rvd')),
    other_comorb: valueToString(getNestedValue(record, 'patient.comorbidities.other')),
    other_comorb_text: valueToString(
      getNestedValue(record, 'patient.comorbidities.other_text'),
    ),
    comorb_any: valueToString(getNestedValue(record, 'patient.comorb_any')),
    preg_test: valueToString(getNestedValue(record, 'patient.preg_test')),
    sats_cat: valueToString(getNestedValue(record, 'sats.sats_cat')),
    tews_total: valueToString(getNestedValue(record, 'sats.tews_total')),
    discriminator_yes: formatBooleanSelect(
      getNestedValue(record, 'sats.discriminator_yes'),
    ),
    discriminator_type: valueToString(getNestedValue(record, 'sats.discriminator_type')),
    discriminator_detail: valueToString(getNestedValue(record, 'sats.discriminator_detail')),
    documentation_complete: formatBooleanSelect(
      getNestedValue(record, 'sats.documentation_complete'),
    ),
    temp: valueToString(getNestedValue(record, 'physiology.temp')),
    hr: valueToString(getNestedValue(record, 'physiology.hr')),
    rr: valueToString(getNestedValue(record, 'physiology.rr')),
    sbp: valueToString(getNestedValue(record, 'physiology.sbp')),
    dbp: valueToString(getNestedValue(record, 'physiology.dbp')),
    spo2: valueToString(getNestedValue(record, 'physiology.spo2')),
    rbs: valueToString(getNestedValue(record, 'physiology.rbs')),
    mobility: valueToString(getNestedValue(record, 'physiology.mobility')),
    avpu: valueToString(getNestedValue(record, 'physiology.avpu')),
    trauma: valueToString(getNestedValue(record, 'physiology.trauma')),
    chief_complaint_verbatim: valueToString(
      getNestedValue(record, 'presentation.chief_complaint_verbatim'),
    ),
    complaint_group: valueToString(getNestedValue(record, 'presentation.complaint_group')),
    multiple_complaints: formatBooleanSelect(
      getNestedValue(record, 'presentation.multiple_complaints'),
    ),
    multiple_complaints_details: valueToString(
      getNestedValue(record, 'presentation.multiple_complaints_details'),
    ),
    initial_destination: valueToString(record.initial_destination),
    clinician_time: formatTimeInput(getNestedValue(record, 'process.clinician_time')),
    treatment_time: formatTimeInput(getNestedValue(record, 'process.treatment_time')),
    doctor_review_datetime: formatDateTimeLocal(
      getNestedValue(record, 'process.doctor_review_datetime'),
    ),
    doctor_diagnosis: valueToString(getNestedValue(record, 'process.doctor_diagnosis')),
    system_diagnosis: valueToString(getNestedValue(record, 'process.system_diagnosis')),
    doctor_review_disposition: valueToString(
      getNestedValue(record, 'process.doctor_review_disposition'),
    ),
    outcome24: valueToString(getNestedValue(record, 'outcome.outcome24')),
    outcome_datetime: formatDateTimeLocal(getNestedValue(record, 'outcome.outcome_datetime')),
    outcome_source: valueToString(getNestedValue(record, 'outcome.outcome_source')),
    final_outcome: valueToString(getNestedValue(record, 'outcome.final_outcome')),
    final_outcome_date: formatDateInput(getNestedValue(record, 'outcome.final_outcome_date')),
  };
}

function buildRecordUpdatePayload(draft: RecordEditDraft) {
  const eligible = toBoolean(draft.eligible);
  return (
    compact({
      study_id: blankToUndefined(draft.study_id),
      initial_destination: blankToUndefined(draft.initial_destination),
      eligibility: compact({
        ed_date: blankToUndefined(draft.ed_date),
        ed_time: blankToUndefined(draft.ed_time),
        triage_time: blankToUndefined(draft.triage_time),
        triaged_by: blankToUndefined(draft.triaged_by),
        age: toNumber(draft.age),
        eligible,
        exclusion_code:
          eligible === false ? blankToUndefined(draft.exclusion_code) : undefined,
        exclusion_reason:
          eligible === false && draft.exclusion_code === '9'
            ? blankToUndefined(draft.exclusion_reason)
            : undefined,
      }),
      patient: compact({
        sex: blankToUndefined(draft.sex),
        referral: blankToUndefined(draft.referral),
        referring_health_center:
          draft.referral === '1'
            ? blankToUndefined(draft.referring_health_center)
            : undefined,
        referring_health_center_other:
          draft.referral === '1'
            ? blankToUndefined(draft.referring_health_center_other)
            : undefined,
        referral_date:
          draft.referral === '1' ? blankToUndefined(draft.referral_date) : undefined,
        referral_time:
          draft.referral === '1' ? blankToUndefined(draft.referral_time) : undefined,
        referred_by:
          draft.referral === '1' ? blankToUndefined(draft.referred_by) : undefined,
        lmuth_called: blankToUndefined(draft.lmuth_called),
        comorbidities: compact({
          dm: blankToUndefined(draft.dm),
          htn: blankToUndefined(draft.htn),
          asthma: blankToUndefined(draft.asthma),
          epilepsy: blankToUndefined(draft.epilepsy),
          rvd: blankToUndefined(draft.rvd),
          other: blankToUndefined(draft.other_comorb),
          other_text:
            draft.other_comorb === '1'
              ? blankToUndefined(draft.other_comorb_text)
              : undefined,
        }),
        comorb_any: blankToUndefined(draft.comorb_any),
        preg_test: draft.sex !== '1' ? blankToUndefined(draft.preg_test) : undefined,
      }),
      sats: compact({
        sats_cat: blankToUndefined(draft.sats_cat),
        tews_total: toNumber(draft.tews_total),
        discriminator_yes: toBoolean(draft.discriminator_yes),
        discriminator_type:
          draft.discriminator_yes === 'true'
            ? blankToUndefined(draft.discriminator_type)
            : undefined,
        discriminator_detail:
          draft.discriminator_yes === 'true' && draft.discriminator_type === '18'
            ? blankToUndefined(draft.discriminator_detail)
            : undefined,
        documentation_complete: toBoolean(draft.documentation_complete),
      }),
      physiology: compact({
        temp: toNumber(draft.temp),
        hr: toNumber(draft.hr),
        rr: toNumber(draft.rr),
        sbp: toNumber(draft.sbp),
        dbp: toNumber(draft.dbp),
        spo2: toNumber(draft.spo2),
        rbs: toNumber(draft.rbs),
        mobility: blankToUndefined(draft.mobility),
        avpu: blankToUndefined(draft.avpu),
        trauma: blankToUndefined(draft.trauma),
      }),
      presentation: compact({
        chief_complaint_verbatim: blankToUndefined(draft.chief_complaint_verbatim),
        complaint_group: blankToUndefined(draft.complaint_group),
        multiple_complaints: toBoolean(draft.multiple_complaints),
        multiple_complaints_details:
          draft.multiple_complaints === 'true'
            ? blankToUndefined(draft.multiple_complaints_details)
            : undefined,
      }),
      process: compact({
        clinician_time: blankToUndefined(draft.clinician_time),
        treatment_time: blankToUndefined(draft.treatment_time),
        doctor_review_datetime: blankToUndefined(draft.doctor_review_datetime),
        doctor_diagnosis: blankToUndefined(draft.doctor_diagnosis),
        system_diagnosis: blankToUndefined(draft.system_diagnosis),
        doctor_review_disposition: blankToUndefined(draft.doctor_review_disposition),
      }),
    }) ?? {}
  );
}

function buildOutcomePayload(draft: RecordEditDraft) {
  const outcome24 = blankToUndefined(draft.outcome24);
  const outcomeDatetime = blankToUndefined(draft.outcome_datetime);
  const outcomeSource = blankToUndefined(draft.outcome_source);

  if (!outcome24 && !outcomeDatetime && !outcomeSource) {
    return undefined;
  }

  if (!outcome24 || !outcomeDatetime || !outcomeSource) {
    return undefined;
  }

  return {
    outcome24,
    outcome_source: outcomeSource,
    ...(outcomeDatetime
      ? { outcome_datetime: new Date(outcomeDatetime).toISOString() }
      : {}),
    ...(blankToUndefined(draft.final_outcome)
      ? { final_outcome: blankToUndefined(draft.final_outcome)! }
      : {}),
    ...(blankToUndefined(draft.final_outcome_date)
      ? {
          final_outcome_date: new Date(
            blankToUndefined(draft.final_outcome_date)!,
          ).toISOString(),
        }
      : {}),
  };
}

function hasPartialOutcome(draft: RecordEditDraft) {
  const values = [
    blankToUndefined(draft.outcome24),
    blankToUndefined(draft.outcome_source),
  ];
  return values.some(Boolean) && !values.every(Boolean);
}

function summarizeDraft(draft: RecordEditDraft) {
  const payload = {
    ...buildRecordUpdatePayload(draft),
    ...(buildOutcomePayload(draft) ?? {}),
  };
  return flattenSummary(payload);
}

function flattenSummary(
  value: Record<string, unknown>,
  prefix = '',
): Array<{ label: string; value: string }> {
  return Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      return flattenSummary(entry as Record<string, unknown>, path);
    }
    return [{ label: path.replaceAll('_', ' '), value: String(entry) }];
  });
}

function compact(value: Record<string, unknown>) {
  const next: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) {
      continue;
    }
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const nested = compact(entry as Record<string, unknown>);
      if (nested && Object.keys(nested).length > 0) {
        next[key] = nested;
      }
      continue;
    }
    next[key] = entry;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function blankToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBoolean(value: string) {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
}

function getNestedValue(value: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, value);
}

function valueToString(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

function formatBooleanSelect(value: unknown) {
  if (value === true || value === 'true') {
    return 'true';
  }
  if (value === false || value === 'false') {
    return 'false';
  }
  return '';
}

function formatDateInput(value: unknown) {
  if (!value) {
    return '';
  }
  const normalized = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

function formatTimeInput(value: unknown) {
  if (!value) {
    return '';
  }
  const normalized = String(value);
  if (/^\d{2}:\d{2}/.test(normalized)) {
    return normalized.slice(0, 5);
  }
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(11, 16);
}

function formatDateTimeLocal(value: unknown) {
  if (!value) {
    return '';
  }
  const normalized = String(value);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized)) {
    return normalized.slice(0, 16);
  }
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 16);
}
