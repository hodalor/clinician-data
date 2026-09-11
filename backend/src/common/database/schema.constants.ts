export const USER_ROLES = ['RA', 'QC', 'PI', 'ADMIN', 'SUPERADMIN'] as const;
export const USER_STATUSES = ['active', 'disabled'] as const;
export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export const RESEARCH_RECORD_STATUSES = [
  'Draft',
  'Clinical Data Complete - Outcome Pending',
  'Complete',
  'Pending Sync',
  'Needs Review',
  'Sync Failed',
  'Synced',
  'QC Required',
  'Returned for Correction',
  'Verified',
  'Locked',
  'Excluded',
] as const;
export type ResearchRecordStatus = (typeof RESEARCH_RECORD_STATUSES)[number];

export const RESEARCH_RECORD_MODES = [
  'PILOT',
  'TRAINING',
  'PRODUCTION',
] as const;
export type ResearchRecordMode = (typeof RESEARCH_RECORD_MODES)[number];

export const EXCLUSION_CODES = ['1', '2', '3', '4', '5', '9'] as const;
export const SEX_CODES = ['1', '2', '9'] as const;
export const REFERRAL_CODES = ['0', '1', '9'] as const;
export const COMORBIDITY_CODES = ['0', '1', '9'] as const;
export const PREG_TEST_CODES = ['0', '1', '8', '9'] as const;
export const SATS_CATEGORY_CODES = ['1', '2', '3', '4'] as const;
export const RDT_CODES = ['0', '1', '8', '9'] as const;
export const MOBILITY_CODES = ['0', '1', '2', '9'] as const;
export const AVPU_CODES = ['0', '1', '2', '3', '9'] as const;
export const TRAUMA_CODES = ['0', '1', '9'] as const;
export const OUTCOME24_CODES = ['1', '2', '3', '4'] as const;

export const DISCRIMINATOR_TYPE_CODES = Object.freeze(
  Array.from({ length: 19 }, (_, index) => `${index}`),
);

export const COMPLAINT_GROUP_CODES = Object.freeze(
  Array.from({ length: 10 }, (_, index) => `${index + 1}`),
);

export const OUTCOME_SOURCE_CODES = Object.freeze(
  Array.from({ length: 6 }, (_, index) => `${index + 1}`),
);
