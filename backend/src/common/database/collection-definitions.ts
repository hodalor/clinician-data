import {
  AVPU_CODES,
  COMORBIDITY_CODES,
  COMPLAINT_GROUP_CODES,
  DISCRIMINATOR_TYPE_CODES,
  EXCLUSION_CODES,
  MOBILITY_CODES,
  OUTCOME24_CODES,
  OUTCOME_SOURCE_CODES,
  PREG_TEST_CODES,
  RDT_CODES,
  REFERRAL_CODES,
  RESEARCH_RECORD_MODES,
  RESEARCH_RECORD_STATUSES,
  SATS_CATEGORY_CODES,
  SEX_CODES,
  TRAUMA_CODES,
  USER_ROLES,
  USER_STATUSES,
} from './schema.constants.js';

type CollectionIndex = {
  key: Record<string, 1 | -1>;
  options?: Record<string, unknown>;
};

export type CollectionDefinition = {
  name: string;
  validator: {
    $jsonSchema: Record<string, unknown>;
  };
  indexes?: CollectionIndex[];
};

const anyValue = {
  bsonType: [
    'array',
    'binData',
    'bool',
    'date',
    'decimal',
    'double',
    'int',
    'long',
    'null',
    'object',
    'objectId',
    'string',
  ],
};

const numberValue = {
  bsonType: ['decimal', 'double', 'int', 'long'],
};

const nullableDate = {
  bsonType: ['date', 'null'],
};

export const collectionDefinitions: CollectionDefinition[] = [
  {
    name: 'users',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          'email',
          'password_hash',
          'role',
          'full_name',
          'status',
          'created_at',
        ],
        properties: {
          email: { bsonType: 'string' },
          password_hash: { bsonType: 'string' },
          role: { enum: [...USER_ROLES] },
          full_name: { bsonType: 'string' },
          status: { enum: [...USER_STATUSES] },
          created_at: { bsonType: 'date' },
        },
      },
    },
  },
  {
    name: 'devices',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['device_id', 'user_id', 'authorised'],
        properties: {
          device_id: { bsonType: 'string' },
          user_id: { bsonType: 'objectId' },
          authorised: { bsonType: 'bool' },
          deactivated_at: nullableDate,
          last_seen_at: nullableDate,
        },
      },
    },
    indexes: [
      {
        key: { user_id: 1, device_id: 1 },
        options: { unique: true, name: 'uq_devices_user_id_device_id' },
      },
    ],
  },
  {
    name: 'device_requests',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['user_id', 'requested_device_id', 'requested_at', 'status'],
        properties: {
          user_id: { bsonType: 'objectId' },
          requested_device_id: { bsonType: 'string' },
          requested_at: { bsonType: 'date' },
          status: { enum: ['pending', 'approved', 'rejected'] },
        },
      },
    },
    indexes: [
      {
        key: { user_id: 1, requested_device_id: 1 },
        options: {
          unique: true,
          name: 'uq_device_requests_user_id_requested_device_id',
        },
      },
      {
        key: { status: 1, requested_at: -1 },
        options: { name: 'idx_device_requests_status_requested_at' },
      },
    ],
  },
  {
    name: 'refresh_tokens',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['user_id', 'jti', 'token_hash', 'expires_at', 'created_at'],
        properties: {
          user_id: { bsonType: 'objectId' },
          jti: { bsonType: 'string' },
          token_hash: { bsonType: 'string' },
          device_id: { bsonType: ['string', 'null'] },
          revoked_at: nullableDate,
          expires_at: { bsonType: 'date' },
          created_at: { bsonType: 'date' },
        },
      },
    },
    indexes: [
      {
        key: { jti: 1 },
        options: { unique: true, name: 'uq_refresh_tokens_jti' },
      },
      {
        key: { user_id: 1, device_id: 1 },
        options: { name: 'idx_refresh_tokens_user_id_device_id' },
      },
      {
        key: { expires_at: 1 },
        options: { name: 'idx_refresh_tokens_expires_at' },
      },
    ],
  },
  {
    name: 'assignments',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['pi_id', 'ra_id', 'date_range', 'status', 'created_at'],
        properties: {
          pi_id: { bsonType: 'objectId' },
          ra_id: { bsonType: 'objectId' },
          date_range: {
            bsonType: 'object',
            required: ['from', 'to'],
            properties: {
              from: { bsonType: 'date' },
              to: { bsonType: 'date' },
            },
          },
          register_pages: {
            bsonType: 'array',
            items: { bsonType: 'string' },
          },
          file_ranges: {
            bsonType: 'array',
            items: { bsonType: 'string' },
          },
          status: { bsonType: 'string' },
          created_at: { bsonType: 'date' },
        },
      },
    },
  },
  {
    name: 'patient_linkage',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          'hospital_record_number_encrypted',
          'hashed_number',
          'study_id',
        ],
        properties: {
          hospital_record_number_encrypted: { bsonType: 'string' },
          hashed_number: { bsonType: 'string' },
          study_id: { bsonType: 'string' },
        },
      },
    },
  },
  {
    name: 'research_records',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          'client_uuid',
          'study_id',
          'status',
          'mode',
          'version',
          'created_at',
          'updated_at',
        ],
        properties: {
          client_uuid: { bsonType: 'string' },
          study_id: { bsonType: 'string' },
          linkage_id: { bsonType: 'objectId' },
          status: { enum: [...RESEARCH_RECORD_STATUSES] },
          mode: { enum: [...RESEARCH_RECORD_MODES] },
          extractor_id: { bsonType: 'objectId' },
          abstract_date: { bsonType: 'date' },
          device_id: { bsonType: 'string' },
          app_version: { bsonType: 'string' },
          data_dictionary_version: { bsonType: 'string' },
          version: numberValue,
          eligibility: {
            bsonType: 'object',
            properties: {
              ed_date: { bsonType: 'date' },
              ed_time: { bsonType: 'string' },
              triage_time: { bsonType: 'string' },
              age: numberValue,
              eligible: { bsonType: 'bool' },
              exclusion_code: { enum: [...EXCLUSION_CODES] },
              exclusion_reason: { bsonType: 'string' },
            },
          },
          patient: {
            bsonType: 'object',
            properties: {
              sex: { enum: [...SEX_CODES] },
              referral: { enum: [...REFERRAL_CODES] },
              comorbidities: {
                bsonType: 'object',
                properties: {
                  dm: { enum: [...COMORBIDITY_CODES] },
                  htn: { enum: [...COMORBIDITY_CODES] },
                  asthma: { enum: [...COMORBIDITY_CODES] },
                  rvd: { enum: [...COMORBIDITY_CODES] },
                  other: { enum: [...COMORBIDITY_CODES] },
                  other_text: { bsonType: 'string' },
                },
              },
              comorb_any: { enum: [...COMORBIDITY_CODES] },
              preg_test: { enum: [...PREG_TEST_CODES] },
            },
          },
          sats: {
            bsonType: 'object',
            properties: {
              sats_cat: { enum: [...SATS_CATEGORY_CODES] },
              tews_total: numberValue,
              discriminator_yes: { bsonType: 'bool' },
              discriminator_type: { enum: [...DISCRIMINATOR_TYPE_CODES] },
              documentation_complete: { bsonType: 'bool' },
            },
          },
          physiology: {
            bsonType: 'object',
            properties: {
              temp: numberValue,
              hr: numberValue,
              rr: numberValue,
              sbp: numberValue,
              dbp: numberValue,
              spo2: numberValue,
              rbs: numberValue,
              rdt: { enum: [...RDT_CODES] },
              mobility: { enum: [...MOBILITY_CODES] },
              avpu: { enum: [...AVPU_CODES] },
              trauma: { enum: [...TRAUMA_CODES] },
            },
          },
          presentation: {
            bsonType: 'object',
            properties: {
              chief_complaint_verbatim: { bsonType: 'string' },
              complaint_group: { enum: [...COMPLAINT_GROUP_CODES] },
              multiple_complaints: { bsonType: 'bool' },
            },
          },
          initial_destination: { bsonType: 'string' },
          process: {
            bsonType: 'object',
            properties: {
              clinician_time: { bsonType: 'string' },
              treatment_time: { bsonType: 'string' },
            },
          },
          data_quality: {
            bsonType: 'object',
            properties: {
              miss_sats: { bsonType: 'bool' },
              miss_tews: { bsonType: 'bool' },
              miss_vitals: { bsonType: 'bool' },
              miss_outcome: { bsonType: 'bool' },
              source_conflict: { bsonType: 'bool' },
              qc_required: { bsonType: 'bool' },
              reviewer_id: { bsonType: 'objectId' },
              qc_comment: { bsonType: 'string' },
            },
          },
          duplicate_flags: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              properties: {
                matched_record_id: { bsonType: 'objectId' },
                basis: {
                  bsonType: 'array',
                  items: { bsonType: 'string' },
                },
                resolved: { bsonType: 'bool' },
              },
            },
          },
          created_at: { bsonType: 'date' },
          updated_at: { bsonType: 'date' },
        },
      },
    },
    indexes: [
      {
        key: { client_uuid: 1 },
        options: { unique: true, name: 'uq_research_records_client_uuid' },
      },
      {
        key: { study_id: 1 },
        options: { unique: true, name: 'uq_research_records_study_id' },
      },
      { key: { status: 1 }, options: { name: 'idx_research_records_status' } },
      { key: { mode: 1 }, options: { name: 'idx_research_records_mode' } },
    ],
  },
  {
    name: 'outcomes',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          'research_record_id',
          'outcome24',
          'outcome_source',
          'verified',
        ],
        properties: {
          research_record_id: { bsonType: 'objectId' },
          outcome24: { enum: [...OUTCOME24_CODES] },
          outcome_datetime: { bsonType: 'date' },
          outcome_source: { enum: [...OUTCOME_SOURCE_CODES] },
          verified: { bsonType: 'bool' },
          verified_by: { bsonType: 'objectId' },
          verified_at: nullableDate,
        },
      },
    },
    indexes: [
      {
        key: { research_record_id: 1 },
        options: { name: 'idx_outcomes_research_record_id' },
      },
    ],
  },
  {
    name: 'qc_reviews',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          'research_record_id',
          'qc_user_id',
          're_abstracted_values',
          'discrepancies',
          'agreement_pct',
          'status',
        ],
        properties: {
          research_record_id: { bsonType: 'objectId' },
          qc_user_id: { bsonType: 'objectId' },
          re_abstracted_values: anyValue,
          discrepancies: {
            bsonType: 'array',
            items: { bsonType: 'string' },
          },
          agreement_pct: numberValue,
          status: { bsonType: 'string' },
        },
      },
    },
    indexes: [
      {
        key: { research_record_id: 1 },
        options: { name: 'idx_qc_reviews_research_record_id' },
      },
    ],
  },
  {
    name: 'audit_logs',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          'research_record_id',
          'field',
          'previous_value',
          'new_value',
          'changed_by',
          'changed_at',
          'reason',
          'app_version',
        ],
        properties: {
          research_record_id: { bsonType: 'objectId' },
          field: { bsonType: 'string' },
          previous_value: anyValue,
          new_value: anyValue,
          changed_by: { bsonType: 'objectId' },
          changed_at: { bsonType: 'date' },
          reason: { bsonType: 'string' },
          app_version: { bsonType: 'string' },
        },
      },
    },
    indexes: [
      {
        key: { research_record_id: 1 },
        options: { name: 'idx_audit_logs_research_record_id' },
      },
    ],
  },
  {
    name: 'sync_logs',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['device_id', 'user_id', 'record_id', 'timestamp', 'status'],
        properties: {
          device_id: { bsonType: 'string' },
          user_id: { bsonType: 'objectId' },
          record_id: { bsonType: 'objectId' },
          timestamp: { bsonType: 'date' },
          status: { bsonType: 'string' },
          error_detail: { bsonType: 'string' },
        },
      },
    },
  },
  {
    name: 'app_versions',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['version', 'data_dictionary_version', 'released_at'],
        properties: {
          version: { bsonType: 'string' },
          data_dictionary_version: { bsonType: 'string' },
          released_at: { bsonType: 'date' },
          notes: { bsonType: 'string' },
        },
      },
    },
  },
  {
    name: 'exclusions',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['research_record_id', 'exclusion_code'],
        properties: {
          research_record_id: { bsonType: 'objectId' },
          exclusion_code: { enum: [...EXCLUSION_CODES] },
          exclusion_reason: { bsonType: 'string' },
        },
      },
    },
  },
];
