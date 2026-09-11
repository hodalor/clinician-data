const yesNoNotRecorded = {
  '0': 'No',
  '1': 'Yes',
  '9': 'Not recorded',
} as const;

const negativePositiveNotDone = {
  '0': 'Negative',
  '1': 'Positive',
  '8': 'Not done / N-A',
  '9': 'Not recorded',
} as const;

const sexLabels = {
  '1': '1 Male',
  '2': '2 Female',
  '9': '9 Not recorded',
} as const;

const referralLabels = {
  '0': '0 Direct',
  '1': '1 Referred',
  '9': '9 Unknown',
} as const;

const exclusionLabels = {
  '1': '1 Age < 16',
  '2': '2 Dead on arrival / Blue',
  '3': '3 SATS category missing',
  '4': '4 24-hour outcome indeterminable',
  '5': '5 Transfer prevents outcome ascertainment',
  '9': '9 Other',
} as const;

const satsCategoryLabels = {
  '1': '1 Green',
  '2': '2 Yellow',
  '3': '3 Orange',
  '4': '4 Red',
} as const;

const complaintGroupLabels = {
  '1': '1 Trauma / injury',
  '2': '2 Cardiovascular / chest pain',
  '3': '3 Respiratory',
  '4': '4 Neurological',
  '5': '5 GI / abdominal',
  '6': '6 Infectious / fever',
  '7': '7 Obstetric / gynaecological',
  '8': '8 Endocrine / metabolic',
  '9': '9 Poisoning / toxicological',
  '10': '10 Other',
} as const;

const discriminatorTypeLabels = {
  '0': '0 No discriminator documented',
  '1': '1 Shock/uncontrolled haemorrhage',
  '2': '2 Chest pain/cardiovascular',
  '3': '3 Seizure/altered consciousness',
  '4': '4 Major trauma/fracture/dislocation',
  '5': '5 Penetrating injury',
  '6': '6 Burns',
  '7': '7 Poisoning/overdose',
  '8': '8 Hypoglycaemia',
  '9': '9 Hypertensive emergency',
  '10': '10 Respiratory distress/shortness of breath',
  '11': '11 Haemoptysis',
  '12': '12 Abdominal pain/trauma',
  '13': '13 Pregnancy-related emergency',
  '14': '14 Bradycardia',
  '15': '15 Controlled haemorrhage',
  '16': '16 Persistent vomiting',
  '17': '17 PV bleeding',
  '18': '18 Other documented discriminator',
} as const;

const mobilityLabels = {
  '0': '0 Walking',
  '1': '1 Wheelchair / assisted',
  '2': '2 Stretcher / bed',
  '9': '9 Not recorded',
} as const;

const avpuLabels = {
  '0': '0 Alert',
  '1': '1 Voice',
  '2': '2 Pain',
  '3': '3 Unresponsive',
  '9': '9 Not recorded',
} as const;

const outcome24Labels = {
  '1': '1 ED discharge',
  '2': '2 Ward',
  '3': '3 HDU / ICU',
  '4': '4 Death',
} as const;

const outcomeSourceLabels = {
  '1': '1 ED record',
  '2': '2 Patient file',
  '3': '3 Ward register',
  '4': '4 HDU / ICU register',
  '5': '5 Mortality record',
  '6': '6 Multiple sources',
} as const;

export const satsCategoryOptions = Object.entries(satsCategoryLabels).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const fieldLabels: Record<string, string> = {
  'eligibility.ed_date': 'ED date',
  'eligibility.ed_time': 'ED time',
  'eligibility.triage_time': 'Triage time',
  'eligibility.age': 'Age',
  'eligibility.eligible': 'Eligible',
  'eligibility.exclusion_code': 'Exclusion code',
  'eligibility.exclusion_reason': 'Exclusion reason',
  'patient.sex': 'Sex',
  'patient.referral': 'Referral',
  'patient.comorbidities.dm': 'Diabetes mellitus',
  'patient.comorbidities.htn': 'Hypertension',
  'patient.comorbidities.asthma': 'Asthma',
  'patient.comorbidities.rvd': 'Retroviral disease',
  'patient.comorbidities.other': 'Other comorbidity',
  'patient.comorbidities.other_text': 'Other comorbidity detail',
  'patient.comorb_any': 'Any comorbidity',
  'patient.preg_test': 'Pregnancy test',
  'sats.sats_cat': 'SATS category',
  'sats.tews_total': 'TEWS total',
  'sats.discriminator_yes': 'Discriminator documented',
  'sats.discriminator_type': 'Discriminator type',
  'sats.documentation_complete': 'SATS complete',
  'physiology.temp': 'Temperature',
  'physiology.hr': 'Heart rate',
  'physiology.rr': 'Respiratory rate',
  'physiology.sbp': 'Systolic blood pressure',
  'physiology.dbp': 'Diastolic blood pressure',
  'physiology.spo2': 'SpO2',
  'physiology.rbs': 'RBS',
  'physiology.rdt': 'Rapid diagnostic test',
  'physiology.mobility': 'Mobility',
  'physiology.avpu': 'AVPU',
  'physiology.trauma': 'Trauma',
  'presentation.chief_complaint_verbatim': 'Chief complaint',
  'presentation.complaint_group': 'Complaint group',
  'presentation.multiple_complaints': 'Multiple complaints',
  initial_destination: 'Immediate destination',
  'process.clinician_time': 'Clinician time',
  'process.treatment_time': 'Treatment time',
  'data_quality.miss_sats': 'Miss SATS',
  'data_quality.miss_tews': 'Miss TEWS',
  'data_quality.miss_vitals': 'Miss vitals',
  'data_quality.miss_outcome': 'Miss outcome',
  'data_quality.source_conflict': 'Source conflict',
  'data_quality.qc_required': 'QC required',
  'data_quality.reviewer_id': 'QC reviewer',
  'data_quality.qc_comment': 'QC comment',
  outcome24: '24-hour outcome',
  outcome_datetime: 'Outcome date and time',
  outcome_source: 'Outcome source',
  outcome_verified: 'Outcome verified',
  'outcome.outcome24': '24-hour outcome',
  'outcome.outcome_datetime': 'Outcome date and time',
  'outcome.outcome_source': 'Outcome source',
  'outcome.verified': 'Outcome verified',
  'outcome.verified_by': 'Outcome verified by',
  'outcome.verified_at': 'Outcome verified at',
  qc_verified: 'QC verified',
};

const valueLabelsByField: Record<string, Record<string, string>> = {
  'eligibility.exclusion_code': exclusionLabels,
  'patient.sex': sexLabels,
  'patient.referral': referralLabels,
  'patient.comorbidities.dm': yesNoNotRecorded,
  'patient.comorbidities.htn': yesNoNotRecorded,
  'patient.comorbidities.asthma': yesNoNotRecorded,
  'patient.comorbidities.rvd': yesNoNotRecorded,
  'patient.comorbidities.other': yesNoNotRecorded,
  'patient.comorb_any': yesNoNotRecorded,
  'patient.preg_test': negativePositiveNotDone,
  'sats.sats_cat': satsCategoryLabels,
  'sats.discriminator_type': discriminatorTypeLabels,
  'physiology.rdt': negativePositiveNotDone,
  'physiology.mobility': mobilityLabels,
  'physiology.avpu': avpuLabels,
  'physiology.trauma': yesNoNotRecorded,
  'presentation.complaint_group': complaintGroupLabels,
  outcome24: outcome24Labels,
  outcome_source: outcomeSourceLabels,
  'outcome.outcome24': outcome24Labels,
  'outcome.outcome_source': outcomeSourceLabels,
};

const yesNoFields = new Set([
  'eligibility.eligible',
  'sats.discriminator_yes',
  'sats.documentation_complete',
  'presentation.multiple_complaints',
  'data_quality.miss_sats',
  'data_quality.miss_tews',
  'data_quality.miss_vitals',
  'data_quality.miss_outcome',
  'data_quality.source_conflict',
  'data_quality.qc_required',
  'outcome.verified',
  'outcome_verified',
  'qc_verified',
]);

export function formatRecordFieldLabel(field: string) {
  return (
    fieldLabels[field] ??
    field
      .split('.')
      .at(-1)!
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (match) => match.toUpperCase())
  );
}

export function formatRecordValue(
  field: string,
  value: unknown,
  emptyLabel = 'Not entered',
) {
  if (value === null || value === undefined || value === '') {
    return emptyLabel;
  }

  const normalized = String(value);
  const fieldLabelsMap = valueLabelsByField[field];

  if (fieldLabelsMap?.[normalized]) {
    return fieldLabelsMap[normalized];
  }

  if (yesNoFields.has(field)) {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (normalized === 'true') {
      return 'Yes';
    }
    if (normalized === 'false') {
      return 'No';
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatGenericValue(item)).join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return normalized;
}

export function formatGenericValue(value: unknown, emptyLabel = 'Not entered') {
  if (value === null || value === undefined || value === '') {
    return emptyLabel;
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}
