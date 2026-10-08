import { Button, Group, Select, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { submitQcReabstraction } from '../../api/qc-api';
import { getInitialDestinationCodes } from '../../api/study-configurations-api';
import { recordFieldOptions } from '../records/record-decoders';

const steps = [
  { id: 'eligibility', title: 'Eligibility' },
  { id: 'patient', title: 'Patient' },
  { id: 'sats', title: 'SATS / TEWS' },
  { id: 'physiology', title: 'Physiology' },
  { id: 'presentation', title: 'Presentation' },
  { id: 'destination', title: 'Disposition' },
  { id: 'process', title: 'Process' },
  { id: 'outcome', title: 'Outcome' },
  { id: 'review', title: 'Review & submit' },
] as const;

type QcDraft = {
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

const emptyDraft: QcDraft = {
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

export function QcReabstractionForm({
  recordId,
  onSubmitted,
}: {
  recordId: string;
  onSubmitted: () => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<QcDraft>(emptyDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const destinationsQuery = useQuery({
    queryKey: ['initial-destination-codes'],
    queryFn: getInitialDestinationCodes,
  });

  const visibleSteps = useMemo(
    () =>
      draft.eligible === 'false'
        ? steps.filter((step) => step.id === 'eligibility' || step.id === 'review')
        : [...steps],
    [draft.eligible],
  );
  const currentStep = visibleSteps[Math.min(stepIndex, visibleSteps.length - 1)]!;
  const sectionCount = visibleSteps.length - 1;

  const submitMutation = useMutation({
    mutationFn: () => submitQcReabstraction(recordId, buildReabstractionPayload(draft)),
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: 'Re-abstraction submitted',
        message: 'You can now compare your entry with the original abstraction.',
      });
      await onSubmitted();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Could not submit re-abstraction',
        message: error.message,
      });
    },
  });

  function update(patch: Partial<QcDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function goNext() {
    if (currentStep.id === 'eligibility' && draft.study_id.trim().length === 0) {
      notifications.show({
        color: 'red',
        title: 'Study ID is required',
        message: 'Enter the study ID from the source record before continuing.',
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

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={3}>Start QC re-abstraction</Title>
        <Text c="dimmed">
          {currentStep.id === 'review'
            ? 'Review & submit'
            : `Section ${stepIndex + 1} of ${sectionCount}: ${currentStep.title}`}
        </Text>
        <Text size="sm" c="dimmed">
          This form starts blank. Enter the values from the source record. The original
          abstraction stays hidden until you submit.
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
            onChange={(value) => update({ sex: value ?? '', preg_test: value === '1' ? '' : draft.preg_test })}
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
          <Select label="Diabetes mellitus" data={recordFieldOptions('patient.comorbidities.dm')} value={draft.dm || null} onChange={(value) => update({ dm: value ?? '' })} clearable />
          <Select label="Hypertension" data={recordFieldOptions('patient.comorbidities.htn')} value={draft.htn || null} onChange={(value) => update({ htn: value ?? '' })} clearable />
          <Select label="Asthma" data={recordFieldOptions('patient.comorbidities.asthma')} value={draft.asthma || null} onChange={(value) => update({ asthma: value ?? '' })} clearable />
          <Select label="Epilepsy" data={recordFieldOptions('patient.comorbidities.epilepsy')} value={draft.epilepsy || null} onChange={(value) => update({ epilepsy: value ?? '' })} clearable />
          <Select label="HIV" data={recordFieldOptions('patient.comorbidities.rvd')} value={draft.rvd || null} onChange={(value) => update({ rvd: value ?? '' })} clearable />
          <Select label="Other comorbidity" data={recordFieldOptions('patient.comorbidities.other')} value={draft.other_comorb || null} onChange={(value) => update({ other_comorb: value ?? '' })} clearable />
          {draft.other_comorb === '1' ? (
            <TextInput
              label="Other comorbidity detail"
              value={draft.other_comorb_text}
              onChange={(event) => update({ other_comorb_text: event.currentTarget.value })}
            />
          ) : null}
          <Select label="Any comorbidity" data={recordFieldOptions('patient.comorb_any')} value={draft.comorb_any || null} onChange={(value) => update({ comorb_any: value ?? '' })} clearable />
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
          <Select label="SATS category" data={recordFieldOptions('sats.sats_cat')} value={draft.sats_cat || null} onChange={(value) => update({ sats_cat: value ?? '' })} clearable />
          <TextInput label="TEWS total" value={draft.tews_total} onChange={(event) => update({ tews_total: event.currentTarget.value })} />
          <Select label="Discriminator documented" data={yesNoOptions} value={draft.discriminator_yes || null} onChange={(value) => update({ discriminator_yes: value ?? '', discriminator_type: value === 'true' ? draft.discriminator_type : '', discriminator_detail: value === 'true' ? draft.discriminator_detail : '' })} clearable />
          {draft.discriminator_yes === 'true' ? (
            <Select label="Discriminator type" data={recordFieldOptions('sats.discriminator_type')} value={draft.discriminator_type || null} onChange={(value) => update({ discriminator_type: value ?? '' })} clearable />
          ) : null}
          {draft.discriminator_yes === 'true' && draft.discriminator_type === '18' ? (
            <TextInput
              label="Other documented discriminator"
              value={draft.discriminator_detail}
              onChange={(event) => update({ discriminator_detail: event.currentTarget.value })}
            />
          ) : null}
          <Select label="SATS complete" data={yesNoOptions} value={draft.documentation_complete || null} onChange={(value) => update({ documentation_complete: value ?? '' })} clearable />
        </SimpleGrid>
      ) : null}

      {currentStep.id === 'physiology' ? (
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <TextInput label="Temperature" value={draft.temp} onChange={(event) => update({ temp: event.currentTarget.value })} />
          <TextInput label="Heart rate" value={draft.hr} onChange={(event) => update({ hr: event.currentTarget.value })} />
          <TextInput label="Respiratory rate" value={draft.rr} onChange={(event) => update({ rr: event.currentTarget.value })} />
          <TextInput label="Systolic blood pressure" value={draft.sbp} onChange={(event) => update({ sbp: event.currentTarget.value })} />
          <TextInput label="Diastolic blood pressure" value={draft.dbp} onChange={(event) => update({ dbp: event.currentTarget.value })} />
          <TextInput label="SpO2" value={draft.spo2} onChange={(event) => update({ spo2: event.currentTarget.value })} />
          <TextInput label="RBS" value={draft.rbs} onChange={(event) => update({ rbs: event.currentTarget.value })} />
          <Select label="Mobility" data={recordFieldOptions('physiology.mobility')} value={draft.mobility || null} onChange={(value) => update({ mobility: value ?? '' })} clearable />
          <Select label="AVPU" data={recordFieldOptions('physiology.avpu')} value={draft.avpu || null} onChange={(value) => update({ avpu: value ?? '' })} clearable />
          <Select label="Trauma" data={recordFieldOptions('physiology.trauma')} value={draft.trauma || null} onChange={(value) => update({ trauma: value ?? '' })} clearable />
        </SimpleGrid>
      ) : null}

      {currentStep.id === 'presentation' ? (
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <TextInput
            label="Chief complaint"
            value={draft.chief_complaint_verbatim}
            onChange={(event) => update({ chief_complaint_verbatim: event.currentTarget.value })}
          />
          <Select label="Complaint group" data={recordFieldOptions('presentation.complaint_group')} value={draft.complaint_group || null} onChange={(value) => update({ complaint_group: value ?? '' })} clearable />
          <Select label="Multiple complaints" data={yesNoOptions} value={draft.multiple_complaints || null} onChange={(value) => update({ multiple_complaints: value ?? '' })} clearable />
          {draft.multiple_complaints === 'true' ? (
            <TextInput
              label="Additional complaints detail"
              value={draft.multiple_complaints_details}
              onChange={(event) => update({ multiple_complaints_details: event.currentTarget.value })}
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
            onChange={(event) => update({ doctor_review_datetime: event.currentTarget.value })}
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
            onChange={(event) => update({ doctor_review_disposition: event.currentTarget.value })}
          />
        </SimpleGrid>
      ) : null}

      {currentStep.id === 'outcome' ? (
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <Select label="24-hour outcome" data={recordFieldOptions('outcome24')} value={draft.outcome24 || null} onChange={(value) => update({ outcome24: value ?? '' })} clearable />
          <TextInput
            label="Outcome date and time"
            type="datetime-local"
            value={draft.outcome_datetime}
            onChange={(event) => update({ outcome_datetime: event.currentTarget.value })}
          />
          <Select label="Outcome source" data={recordFieldOptions('outcome_source')} value={draft.outcome_source || null} onChange={(value) => update({ outcome_source: value ?? '' })} clearable />
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
            Check your own entry, then submit. Nothing from the original abstraction is included here.
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
          <Button color="yellow" loading={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
            Submit re-abstraction
          </Button>
        ) : (
          <Button color="yellow" onClick={goNext}>
            Next
          </Button>
        )}
      </Group>
    </Stack>
  );
}

function buildReabstractionPayload(draft: QcDraft) {
  const eligible = toBoolean(draft.eligible);
  const payload: Record<string, unknown> = {
    study_id: blankToUndefined(draft.study_id),
    initial_destination: blankToUndefined(draft.initial_destination),
    eligibility: compact({
      ed_date: blankToUndefined(draft.ed_date),
      ed_time: blankToUndefined(draft.ed_time),
      triage_time: blankToUndefined(draft.triage_time),
      triaged_by: blankToUndefined(draft.triaged_by),
      age: toNumber(draft.age),
      eligible,
      exclusion_code: eligible === false ? blankToUndefined(draft.exclusion_code) : undefined,
      exclusion_reason:
        eligible === false && draft.exclusion_code === '9'
          ? blankToUndefined(draft.exclusion_reason)
          : undefined,
    }),
    patient: compact({
      sex: blankToUndefined(draft.sex),
      referral: blankToUndefined(draft.referral),
      referring_health_center:
        draft.referral === '1' ? blankToUndefined(draft.referring_health_center) : undefined,
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
        other_text: draft.other_comorb === '1' ? blankToUndefined(draft.other_comorb_text) : undefined,
      }),
      comorb_any: blankToUndefined(draft.comorb_any),
      preg_test: draft.sex !== '1' ? blankToUndefined(draft.preg_test) : undefined,
    }),
    sats: compact({
      sats_cat: blankToUndefined(draft.sats_cat),
      tews_total: toNumber(draft.tews_total),
      discriminator_yes: toBoolean(draft.discriminator_yes),
      discriminator_type:
        draft.discriminator_yes === 'true' ? blankToUndefined(draft.discriminator_type) : undefined,
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
    outcome24: blankToUndefined(draft.outcome24),
    outcome_datetime: draft.outcome_datetime
      ? new Date(draft.outcome_datetime).toISOString()
      : undefined,
    outcome_source: blankToUndefined(draft.outcome_source),
    final_outcome: blankToUndefined(draft.final_outcome),
    final_outcome_date: draft.final_outcome_date
      ? new Date(draft.final_outcome_date).toISOString()
      : undefined,
  };

  return compact(payload) ?? {};
}

function summarizeDraft(draft: QcDraft) {
  const payload = buildReabstractionPayload(draft);
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
