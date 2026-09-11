import { Schema } from 'mongoose';
import {
  AVPU_CODES,
  COMORBIDITY_CODES,
  COMPLAINT_GROUP_CODES,
  DISCRIMINATOR_TYPE_CODES,
  EXCLUSION_CODES,
  MOBILITY_CODES,
  PREG_TEST_CODES,
  RDT_CODES,
  REFERRAL_CODES,
  RESEARCH_RECORD_MODES,
  RESEARCH_RECORD_STATUSES,
  SATS_CATEGORY_CODES,
  SEX_CODES,
  TRAUMA_CODES,
} from '../../../common/database/schema.constants.js';
import { auditTrailPlugin } from '../../audit/audit-trail.plugin.js';

export const ResearchRecordModelName = 'ResearchRecord';

const EligibilitySchema = new Schema(
  {
    ed_date: { type: Date },
    ed_time: { type: String, trim: true },
    triage_time: { type: String, trim: true },
    age: { type: Number },
    eligible: { type: Boolean },
    exclusion_code: { type: String, enum: EXCLUSION_CODES },
    exclusion_reason: { type: String, trim: true },
  },
  { _id: false, versionKey: false },
);

const ComorbiditiesSchema = new Schema(
  {
    dm: { type: String, enum: COMORBIDITY_CODES },
    htn: { type: String, enum: COMORBIDITY_CODES },
    asthma: { type: String, enum: COMORBIDITY_CODES },
    rvd: { type: String, enum: COMORBIDITY_CODES },
    other: { type: String, enum: COMORBIDITY_CODES },
    other_text: { type: String, trim: true },
  },
  { _id: false, versionKey: false },
);

const PatientSchema = new Schema(
  {
    sex: { type: String, enum: SEX_CODES },
    referral: { type: String, enum: REFERRAL_CODES },
    comorbidities: { type: ComorbiditiesSchema },
    comorb_any: { type: String, enum: COMORBIDITY_CODES },
    preg_test: { type: String, enum: PREG_TEST_CODES },
  },
  { _id: false, versionKey: false },
);

const SatsSchema = new Schema(
  {
    sats_cat: { type: String, enum: SATS_CATEGORY_CODES },
    tews_total: { type: Number },
    discriminator_yes: { type: Boolean },
    discriminator_type: { type: String, enum: DISCRIMINATOR_TYPE_CODES },
    documentation_complete: { type: Boolean },
  },
  { _id: false, versionKey: false },
);

const PhysiologySchema = new Schema(
  {
    temp: { type: Number },
    hr: { type: Number },
    rr: { type: Number },
    sbp: { type: Number },
    dbp: { type: Number },
    spo2: { type: Number },
    rbs: { type: Number },
    rdt: { type: String, enum: RDT_CODES },
    mobility: { type: String, enum: MOBILITY_CODES },
    avpu: { type: String, enum: AVPU_CODES },
    trauma: { type: String, enum: TRAUMA_CODES },
  },
  { _id: false, versionKey: false },
);

const PresentationSchema = new Schema(
  {
    chief_complaint_verbatim: { type: String, trim: true },
    complaint_group: { type: String, enum: COMPLAINT_GROUP_CODES },
    multiple_complaints: { type: Boolean },
  },
  { _id: false, versionKey: false },
);

const ProcessSchema = new Schema(
  {
    clinician_time: { type: String, trim: true },
    treatment_time: { type: String, trim: true },
  },
  { _id: false, versionKey: false },
);

const DataQualitySchema = new Schema(
  {
    miss_sats: { type: Boolean },
    miss_tews: { type: Boolean },
    miss_vitals: { type: Boolean },
    miss_outcome: { type: Boolean },
    source_conflict: { type: Boolean },
    qc_required: { type: Boolean },
    reviewer_id: { type: Schema.Types.ObjectId, ref: 'User' },
    qc_comment: { type: String, trim: true },
  },
  { _id: false, versionKey: false },
);

const DuplicateFlagSchema = new Schema(
  {
    matched_record_id: { type: Schema.Types.ObjectId, ref: 'ResearchRecord' },
    basis: [{ type: String }],
    resolved: { type: Boolean },
  },
  { _id: false, versionKey: false },
);

export const ResearchRecordSchema = new Schema(
  {
    client_uuid: { type: String, required: true, trim: true },
    study_id: { type: String, required: true, trim: true },
    linkage_id: {
      type: Schema.Types.ObjectId,
      ref: 'PatientLinkage',
    },
    status: {
      type: String,
      enum: RESEARCH_RECORD_STATUSES,
      required: true,
    },
    mode: {
      type: String,
      enum: RESEARCH_RECORD_MODES,
      required: true,
    },
    extractor_id: { type: Schema.Types.ObjectId, ref: 'User' },
    abstract_date: { type: Date },
    device_id: { type: String, trim: true },
    app_version: { type: String, trim: true },
    data_dictionary_version: { type: String, trim: true },
    version: { type: Number, required: true },
    eligibility: { type: EligibilitySchema },
    patient: { type: PatientSchema },
    sats: { type: SatsSchema },
    physiology: { type: PhysiologySchema },
    presentation: { type: PresentationSchema },
    initial_destination: { type: String, trim: true },
    process: { type: ProcessSchema },
    data_quality: { type: DataQualitySchema },
    duplicate_flags: { type: [DuplicateFlagSchema], default: [] },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true },
  },
  {
    collection: 'research_records',
    versionKey: false,
  },
);

ResearchRecordSchema.index(
  { client_uuid: 1 },
  { unique: true, name: 'uq_research_records_client_uuid' },
);
ResearchRecordSchema.index(
  { study_id: 1 },
  { unique: true, name: 'uq_research_records_study_id' },
);
ResearchRecordSchema.index(
  { status: 1 },
  { name: 'idx_research_records_status' },
);
ResearchRecordSchema.index({ mode: 1 }, { name: 'idx_research_records_mode' });
ResearchRecordSchema.plugin(auditTrailPlugin);
