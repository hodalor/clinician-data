import 'dotenv/config';
import argon2 from 'argon2';
import { MongoClient, ObjectId } from 'mongodb';
import { randomUUID } from 'crypto';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI is required to run the seed script');
}

const client = new MongoClient(uri);

const now = new Date();
const raId = new ObjectId();
const qcId = new ObjectId();
const piId = new ObjectId();
const adminId = new ObjectId();
const superAdminId = new ObjectId();
const superAdminEmail =
  process.env.SEED_SUPERADMIN_EMAIL?.trim().toLowerCase() ||
  'superadmin@example.com';
const superAdminPassword =
  process.env.SEED_SUPERADMIN_PASSWORD?.trim() || 'Password123!';
const superAdminName =
  process.env.SEED_SUPERADMIN_FULL_NAME?.trim() || 'Developer Superadmin';

const userDocs = [
  {
    _id: raId,
    email: 'ra@example.com',
    password_hash: await argon2.hash('Password123!'),
    role: 'RA',
    full_name: 'Training RA',
    status: 'active',
    created_at: now,
  },
  {
    _id: qcId,
    email: 'qc@example.com',
    password_hash: await argon2.hash('Password123!'),
    role: 'QC',
    full_name: 'Training QC',
    status: 'active',
    created_at: now,
  },
  {
    _id: piId,
    email: 'pi@example.com',
    password_hash: await argon2.hash('Password123!'),
    role: 'PI',
    full_name: 'Training PI',
    status: 'active',
    created_at: now,
  },
  {
    _id: adminId,
    email: 'admin@example.com',
    password_hash: await argon2.hash('Password123!'),
    role: 'ADMIN',
    full_name: 'Training Admin',
    status: 'active',
    created_at: now,
  },
  {
    _id: superAdminId,
    email: superAdminEmail,
    password_hash: await argon2.hash(superAdminPassword),
    role: 'SUPERADMIN',
    full_name: superAdminName,
    status: 'active',
    created_at: now,
  },
];

const deviceDocs = [
  {
    device_id: 'training-device-ra-1',
    user_id: raId,
    authorised: true,
    deactivated_at: null,
    last_seen_at: now,
  },
  {
    device_id: 'training-device-ra-2',
    user_id: raId,
    authorised: false,
    deactivated_at: now,
    last_seen_at: now,
  },
];

const assignmentId = new ObjectId();
const assignmentDocs = [
  {
    _id: assignmentId,
    pi_id: piId,
    ra_id: raId,
    date_range: {
      from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      to: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
    register_pages: ['1-5'],
    file_ranges: ['A-C'],
    status: 'active',
    created_at: now,
  },
];

const studyConfigurationDocs = [
  {
    key: 'initial_destination_codes',
    values: [
      { code: 'Resus', label: 'Resus' },
      { code: 'Surgical ward', label: 'Surgical ward' },
      { code: 'Medical ward', label: 'Medical ward' },
      { code: 'Paediatric ward', label: 'Paediatric ward' },
      { code: 'Obstetric/Gynae ward', label: 'Obstetric/Gynae ward' },
      { code: 'ICU/HDU', label: 'ICU/HDU' },
      { code: 'Operating theatre', label: 'Operating theatre' },
      { code: 'Discharged home', label: 'Discharged home' },
      { code: 'Referred/transferred', label: 'Referred/transferred' },
      { code: 'Mortuary', label: 'Mortuary' },
      { code: 'Other', label: 'Other' },
    ],
    updated_by: null,
    updated_at: now,
  },
];

const satsCategories = ['1', '2', '3', '4'];
const outcomes = ['1', '2', '3', '4'];

const linkageDocs = Array.from({ length: 8 }, (_, index) => ({
  _id: new ObjectId(),
  hospital_record_number_encrypted: `encrypted-training-${index + 1}`,
  hashed_number: `hash-training-${index + 1}`,
  study_id: `TRAIN-${index + 1}`,
}));

const recordDocs = linkageDocs.map((linkage, index) => ({
  _id: new ObjectId(),
  client_uuid: randomUUID(),
  study_id: linkage.study_id,
  linkage_id: linkage._id,
  status: 'Synced',
  mode: 'TRAINING',
  extractor_id: raId,
  abstract_date: now,
  device_id: 'training-device-ra-1',
  app_version: 'seed-1.0.0',
  data_dictionary_version: 'seed-dd-1',
  version: 2,
  eligibility: {
    ed_date: new Date(now.getTime() - index * 3600_000),
    ed_time: `0${(index % 9) + 1}:00`,
    triage_time: `0${(index % 9) + 1}:15`,
    age: 20 + index,
    eligible: true,
  },
  patient: {
    sex: index % 2 === 0 ? '1' : '2',
    referral: '1',
    comorbidities: {
      dm: '0',
      htn: '1',
      asthma: '0',
      rvd: '0',
      other: '0',
      other_text: '',
    },
    comorb_any: '1',
    preg_test: '9',
  },
  sats: {
    sats_cat: satsCategories[index % satsCategories.length],
    tews_total: index + 1,
    discriminator_yes: index % 2 === 0,
    discriminator_type: index % 2 === 0 ? `${(index % 3) + 1}` : '0',
    documentation_complete: true,
  },
  physiology: {
    temp: 36.5 + index * 0.1,
    hr: 80 + index * 5,
    rr: 18 + index,
    sbp: 110 + index,
    dbp: 70 + index,
    spo2: 95 - (index % 4),
    rbs: 5 + index * 0.2,
    rdt: '0',
    mobility: '1',
    avpu: '0',
    trauma: '0',
  },
  presentation: {
    chief_complaint_verbatim: `Synthetic complaint ${index + 1}`,
    complaint_group: `${(index % 10) + 1}`,
    multiple_complaints: index % 3 === 0,
  },
  initial_destination: 'ED',
  process: {
    clinician_time: `0${(index % 9) + 1}:30`,
    treatment_time: `0${(index % 9) + 1}:45`,
  },
  data_quality: {
    miss_sats: false,
    miss_tews: false,
    miss_vitals: false,
    miss_outcome: false,
    source_conflict: false,
    qc_required: index % 2 === 0,
    qc_comment: '',
    ...(index % 2 === 0 ? { reviewer_id: qcId } : {}),
  },
  duplicate_flags: [],
  created_at: now,
  updated_at: now,
}));

const outcomeDocs = recordDocs.map((record, index) => ({
  _id: new ObjectId(),
  research_record_id: record._id,
  outcome24: outcomes[index % outcomes.length],
  outcome_datetime: new Date(now.getTime() + index * 3600_000),
  outcome_source: `${(index % 6) + 1}`,
  verified: index % 2 === 0,
  verified_at: index % 2 === 0 ? now : null,
  ...(index % 2 === 0 ? { verified_by: qcId } : {}),
}));

try {
  await client.connect();
  const db = client.db();

  await db.collection('users').deleteMany({
    email: { $in: userDocs.map((user) => user.email) },
  });
  await db.collection('devices').deleteMany({
    device_id: { $in: deviceDocs.map((device) => device.device_id) },
  });
  await db.collection('assignments').deleteMany({ _id: assignmentId });
  await db.collection('study_configurations').deleteMany({
    key: { $in: studyConfigurationDocs.map((entry) => entry.key) },
  });
  await db.collection('research_records').deleteMany({
    study_id: { $in: recordDocs.map((record) => record.study_id) },
  });
  await db.collection('patient_linkage').deleteMany({
    study_id: { $in: linkageDocs.map((linkage) => linkage.study_id) },
  });
  await db.collection('outcomes').deleteMany({
    research_record_id: { $in: outcomeDocs.map((outcome) => outcome.research_record_id) },
  });

  await db.collection('users').insertMany(userDocs);
  await db.collection('devices').insertMany(deviceDocs);
  await db.collection('assignments').insertMany(assignmentDocs);
  await db.collection('study_configurations').insertMany(studyConfigurationDocs);
  await db.collection('patient_linkage').insertMany(linkageDocs);
  await db.collection('research_records').insertMany(recordDocs);
  await db.collection('outcomes').insertMany(outcomeDocs);

  console.log('Seed completed.');
  console.log('Users created:', userDocs.map((user) => `${user.role}:${user.email}`).join(', '));
  console.log(
    `SUPERADMIN login: ${superAdminEmail} / ${superAdminPassword}`,
  );
} finally {
  await client.close();
}
