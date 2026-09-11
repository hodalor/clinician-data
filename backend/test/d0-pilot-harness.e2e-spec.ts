import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import argon2 from 'argon2';
import { execFile, spawn, type ChildProcess } from 'child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { MongoClient } from 'mongodb';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import * as XLSX from 'xlsx';
import { AssignmentModelName } from '../src/modules/assignments/schemas/assignment.schema.js';
import { AuditLogModelName } from '../src/modules/audit/schemas/audit-log.schema.js';
import { DeviceModelName } from '../src/modules/devices/schemas/device.schema.js';
import { ExportLogModelName } from '../src/modules/export/schemas/export-log.schema.js';
import { OutcomeModelName } from '../src/modules/outcomes/schemas/outcome.schema.js';
import { QcReviewModelName } from '../src/modules/qc/schemas/qc-review.schema.js';
import { ExclusionModelName } from '../src/modules/records/schemas/exclusion.schema.js';
import { PatientLinkageModelName } from '../src/modules/records/schemas/patient-linkage.schema.js';
import { ResearchRecordModelName } from '../src/modules/records/schemas/research-record.schema.js';
import { RefreshTokenModelName } from '../src/modules/auth/schemas/refresh-token.schema.js';
import { SyncLogModelName } from '../src/modules/sync/schemas/sync-log.schema.js';
import { UserModelName } from '../src/modules/users/schemas/user.schema.js';

jest.setTimeout(180000);

type ScenarioResult = {
  name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
};

const scenarioResults: ScenarioResult[] = [];
const REPORT_PATH = join(
  process.cwd(),
  'test-reports',
  'd0-backend-scenarios-report.md',
);
const MASTER_COLUMNS = [
  'study_id',
  'ed_date',
  'ed_time',
  'triage_time',
  'age',
  'sex',
  'referral',
  'dm',
  'htn',
  'asthma',
  'rvd',
  'other_comorb',
  'comorb_any',
  'preg_test',
  'temp',
  'hr',
  'rr',
  'sbp',
  'dbp',
  'spo2',
  'rbs',
  'rdt',
  'mobility',
  'avpu',
  'trauma',
  'tews_total',
  'complaint_text',
  'complaint_group',
  'multiple_complaint',
  'discriminator_yes',
  'discriminator_type',
  'sats_cat',
  'initial_destination',
  'clinician_time',
  'treatment_time',
  'outcome24',
  'outcome_datetime',
  'outcome_source',
  'outcome_verified',
  'sats_complete',
  'miss_sats',
  'miss_tews',
  'miss_vitals',
  'miss_outcome',
  'source_conflict',
  'qc_verified',
  'qc_reviewer',
] as const;

describe('D0 pilot harness', () => {
  let mongodProcess: ChildProcess | undefined;
  let mongoDbPath: string | undefined;
  let mongoUri: string;
  let app: INestApplication;
  let userModel: Model<any>;
  let assignmentModel: Model<any>;
  let recordModel: Model<any>;
  let outcomeModel: Model<any>;
  let deviceModel: Model<any>;
  let syncLogModel: Model<any>;
  let qcReviewModel: Model<any>;
  let patientLinkageModel: Model<any>;
  let auditLogModel: Model<any>;
  let refreshTokenModel: Model<any>;
  let exclusionModel: Model<any>;
  let exportLogModel: Model<any>;

  beforeAll(async () => {
    const mongoPort = 27027;
    mongoDbPath = await mkdtemp(join(tmpdir(), 'seu-backend-d0-'));
    mongodProcess = spawn(
      'mongod',
      [
        '--dbpath',
        mongoDbPath,
        '--replSet',
        'rs-test',
        '--bind_ip',
        '127.0.0.1',
        '--port',
        `${mongoPort}`,
      ],
      { stdio: 'ignore' },
    );
    mongoUri = `mongodb://127.0.0.1:${mongoPort}/seu_backend_test?replicaSet=rs-test`;

    await waitForMongo(`mongodb://127.0.0.1:${mongoPort}/admin`);
    await execMongoShell(
      mongoPort,
      `try { rs.initiate({_id: 'rs-test', members: [{ _id: 0, host: '127.0.0.1:${mongoPort}' }]}); } catch (error) { print(error.message); }`,
    );
    await waitForMongo(mongoUri);

    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = mongoUri;
    process.env.JWT_ACCESS_SECRET = 'integration-access-secret';
    process.env.JWT_REFRESH_SECRET = 'integration-refresh-secret';
    process.env.PORT = '3100';
    process.env.CORS_ORIGINS = 'http://localhost:5173';

    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userModel = moduleFixture.get<Model<any>>(getModelToken(UserModelName));
    assignmentModel = moduleFixture.get<Model<any>>(
      getModelToken(AssignmentModelName),
    );
    recordModel = moduleFixture.get<Model<any>>(
      getModelToken(ResearchRecordModelName),
    );
    outcomeModel = moduleFixture.get<Model<any>>(getModelToken(OutcomeModelName));
    deviceModel = moduleFixture.get<Model<any>>(getModelToken(DeviceModelName));
    syncLogModel = moduleFixture.get<Model<any>>(getModelToken(SyncLogModelName));
    qcReviewModel = moduleFixture.get<Model<any>>(getModelToken(QcReviewModelName));
    patientLinkageModel = moduleFixture.get<Model<any>>(
      getModelToken(PatientLinkageModelName),
    );
    auditLogModel = moduleFixture.get<Model<any>>(getModelToken(AuditLogModelName));
    refreshTokenModel = moduleFixture.get<Model<any>>(
      getModelToken(RefreshTokenModelName),
    );
    exclusionModel = moduleFixture.get<Model<any>>(getModelToken(ExclusionModelName));
    exportLogModel = moduleFixture.get<Model<any>>(getModelToken(ExportLogModelName));

    await Promise.all(
      [
        userModel,
        assignmentModel,
        recordModel,
        outcomeModel,
        deviceModel,
        syncLogModel,
        qcReviewModel,
        patientLinkageModel,
        auditLogModel,
        refreshTokenModel,
        exclusionModel,
        exportLogModel,
      ].map((model) => model.createCollection().catch(() => undefined)),
    );
  });

  beforeEach(async () => {
    await Promise.all([
      exportLogModel.deleteMany({}),
      exclusionModel.deleteMany({}),
      auditLogModel.deleteMany({}),
      qcReviewModel.deleteMany({}),
      syncLogModel.deleteMany({}),
      outcomeModel.deleteMany({}),
      recordModel.deleteMany({}),
      patientLinkageModel.deleteMany({}),
      deviceModel.deleteMany({}),
      assignmentModel.deleteMany({}),
      refreshTokenModel.deleteMany({}),
      userModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await writeScenarioReport();
    await app?.close();
    if (mongodProcess) {
      mongodProcess.kill('SIGTERM');
    }
    if (mongoDbPath) {
      await rm(mongoDbPath, { recursive: true, force: true });
    }
  });

  scenario(
    '1. Four-device offline creation ends with exactly 40 unique PILOT records',
    async () => {
      const pi = await createUser({
        email: 'pi-four@example.com',
        role: 'PI',
        full_name: 'PI Four',
      });
      const ras = await Promise.all(
        Array.from({ length: 4 }, (_, index) =>
          createUser({
            email: `ra0${index + 1}@example.com`,
            role: 'RA',
            full_name: `RA0${index + 1}`,
          }),
        ),
      );

      await Promise.all(ras.map((ra) => createActiveAssignment(ra._id, pi._id)));

      for (const [index, ra] of ras.entries()) {
        const deviceId = `pilot-device-${index + 1}`;
        const accessToken = await login(ra.email, deviceId);
        const records = Array.from({ length: 10 }, (_, recordIndex) =>
          buildSyncItem({
            recordNumber: index * 10 + recordIndex + 1,
            studyPrefix: `RA0${index + 1}`,
            mode: 'PILOT',
            includeOutcome: true,
          }),
        );

        const response = await syncBatch(accessToken, deviceId, records);
        expect(response.body.results).toHaveLength(10);
        expect(
          response.body.results.every(
            (result: { result: string }) => result.result === 'success',
          ),
        ).toBe(true);
      }

      const persisted = await recordModel.find({}).lean();
      expect(persisted).toHaveLength(40);
      expect(new Set(persisted.map((record: any) => record.client_uuid)).size).toBe(
        40,
      );
      expect(new Set(persisted.map((record: any) => record.study_id)).size).toBe(40);

      for (const [index, ra] of ras.entries()) {
        const deviceId = `pilot-device-${index + 1}`;
        const owned = persisted.filter(
          (record: any) =>
            record.device_id === deviceId &&
            record.extractor_id?.toString() === ra._id.toString(),
        );
        expect(owned).toHaveLength(10);
      }

      expect(
        persisted.every(
          (record: any) => !Array.isArray(record.duplicate_flags) || record.duplicate_flags.length === 0,
        ),
      ).toBe(true);
    },
  );

  scenario(
    '2. Interrupted sync stays atomic and retry remains idempotent',
    async () => {
      const pi = await createUser({
        email: 'pi-interrupt@example.com',
        role: 'PI',
        full_name: 'PI Interrupt',
      });
      const ra = await createUser({
        email: 'ra-interrupt@example.com',
        role: 'RA',
        full_name: 'RA Interrupt',
      });
      await createActiveAssignment(ra._id, pi._id);

      const deviceId = 'interrupt-device';
      const accessToken = await login(ra.email, deviceId);
      const first = buildSyncItem({
        recordNumber: 1,
        studyPrefix: 'INT',
        mode: 'PILOT',
        includeOutcome: true,
      });
      const second = buildSyncItem({
        recordNumber: 2,
        studyPrefix: 'INT',
        mode: 'PILOT',
        includeOutcome: true,
      });

      const originalCreate = syncLogModel.create.bind(syncLogModel);
      let syncedCreateCount = 0;
      const createSpy = jest
        .spyOn(syncLogModel, 'create')
        .mockImplementation(async (...args: any[]) => {
          const documents = args[0] as Array<{ status?: string }>;
          if (documents?.[0]?.status === 'Synced') {
            syncedCreateCount += 1;
            if (syncedCreateCount === 2) {
              throw new Error('Simulated mid-batch connection drop');
            }
          }
          return originalCreate(...args);
        });

      const interrupted = await syncBatch(accessToken, deviceId, [first, second]);
      createSpy.mockRestore();

      expect(interrupted.body.results[0].result).toBe('success');
      expect(interrupted.body.results[1].result).toBe('error');
      expect(
        await recordModel.countDocuments({ client_uuid: first.client_uuid }),
      ).toBe(1);
      expect(
        await recordModel.countDocuments({ client_uuid: second.client_uuid }),
      ).toBe(0);

      const retry = await syncBatch(accessToken, deviceId, [first, second]);
      expect(retry.body.results[0].result).toBe('success');
      expect(retry.body.results[1].result).toBe('success');
      expect(
        await recordModel.countDocuments({ client_uuid: first.client_uuid }),
      ).toBe(1);
      expect(
        await recordModel.countDocuments({ client_uuid: second.client_uuid }),
      ).toBe(1);

      const failedLogs = await syncLogModel.countDocuments({
        device_id: deviceId,
        status: 'Sync Failed',
      });
      expect(failedLogs).toBeGreaterThanOrEqual(1);
    },
  );

  scenario(
    '3. Duplicate detection flags both records and surfaces them in the queue',
    async () => {
      const pi = await createUser({
        email: 'pi-duplicate@example.com',
        role: 'PI',
        full_name: 'PI Duplicate',
      });
      const qc = await createUser({
        email: 'qc-duplicate@example.com',
        role: 'QC',
        full_name: 'QC Duplicate',
      });
      const raOne = await createUser({
        email: 'ra-dup-one@example.com',
        role: 'RA',
        full_name: 'RA Dup One',
      });
      const raTwo = await createUser({
        email: 'ra-dup-two@example.com',
        role: 'RA',
        full_name: 'RA Dup Two',
      });
      await Promise.all([
        createActiveAssignment(raOne._id, pi._id),
        createActiveAssignment(raTwo._id, pi._id),
      ]);

      const firstToken = await login(raOne.email, 'dup-device-1');
      const secondToken = await login(raTwo.email, 'dup-device-2');
      const piToken = await login(pi.email);
      const duplicateSeed = {
        hashedNumber: 'shared-hash',
        edDateIso: '2026-02-01T08:00:00.000Z',
        edTime: '08:00',
        age: 41,
        sex: '1',
      };

      await syncBatch(firstToken, 'dup-device-1', [
        buildSyncItem({
          recordNumber: 1,
          studyPrefix: 'DUPA',
          mode: 'PILOT',
          includeOutcome: true,
          ...duplicateSeed,
        }),
      ]);
      await syncBatch(secondToken, 'dup-device-2', [
        buildSyncItem({
          recordNumber: 2,
          studyPrefix: 'DUPB',
          mode: 'PILOT',
          includeOutcome: true,
          ...duplicateSeed,
        }),
      ]);

      const duplicates = await recordModel
        .find({ 'duplicate_flags.0': { $exists: true } })
        .lean();
      expect(duplicates).toHaveLength(2);
      expect(
        duplicates.every((record: any) => record.duplicate_flags[0].resolved === false),
      ).toBe(true);

      const queue = await request(app.getHttpServer())
        .get('/qc/duplicates')
        .set('Authorization', `Bearer ${piToken}`)
        .expect(200);
      expect(queue.body.data).toHaveLength(2);
      expect(await recordModel.countDocuments()).toBe(2);
      expect(await patientLinkageModel.countDocuments()).toBe(2);

      const qcToken = await login(qc.email);
      await request(app.getHttpServer())
        .get('/qc/duplicates')
        .set('Authorization', `Bearer ${qcToken}`)
        .expect(200);
    },
  );

  scenario(
    '4. Outcome-pending records move to Complete after the outcome arrives later',
    async () => {
      const pi = await createUser({
        email: 'pi-outcome@example.com',
        role: 'PI',
        full_name: 'PI Outcome',
      });
      const ra = await createUser({
        email: 'ra-outcome@example.com',
        role: 'RA',
        full_name: 'RA Outcome',
      });
      await createActiveAssignment(ra._id, pi._id);
      const token = await login(ra.email, 'outcome-device');

      const createResponse = await request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${token}`)
        .send(buildDraftPayload({ studyId: 'OUTCOME-PILOT-1', mode: 'PILOT' }))
        .expect(201);
      const recordId = createResponse.body.record._id as string;

      const submitWithoutOutcome = await request(app.getHttpServer())
        .post(`/records/${recordId}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);
      expect(submitWithoutOutcome.body.record.status).toBe(
        'Clinical Data Complete - Outcome Pending',
      );

      const withOutcome = await request(app.getHttpServer())
        .post(`/records/${recordId}/outcome`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          outcome24: '2',
          outcome_datetime: '2026-02-01T12:00:00.000Z',
          outcome_source: '1',
        })
        .expect(201);
      expect(withOutcome.body.record.status).toBe('Complete');

      const persistedOutcome = await outcomeModel.findOne({
        research_record_id: new Types.ObjectId(recordId),
      });
      expect(persistedOutcome).not.toBeNull();
    },
  );

  scenario(
    '5. QC blind re-abstraction stays blind and reports mismatches correctly',
    async () => {
      const pi = await createUser({
        email: 'pi-qc@example.com',
        role: 'PI',
        full_name: 'PI QC',
      });
      const qc = await createUser({
        email: 'qc@example.com',
        role: 'QC',
        full_name: 'QC User',
      });
      const ra = await createUser({
        email: 'ra-qc@example.com',
        role: 'RA',
        full_name: 'RA QC',
      });
      await createActiveAssignment(ra._id, pi._id);

      const raToken = await login(ra.email, 'qc-device');
      const piToken = await login(pi.email);
      const qcToken = await login(qc.email);

      const qcSourceRecord = buildSyncItem({
        recordNumber: 1,
        studyPrefix: 'QC',
        mode: 'PILOT',
        includeOutcome: true,
      });
      const syncResponse = await syncBatch(raToken, 'qc-device', [qcSourceRecord]);
      const recordId = syncResponse.body.results[0].record_id as string;

      await request(app.getHttpServer())
        .post('/qc/assign')
        .set('Authorization', `Bearer ${piToken}`)
        .send({ qc_user_id: qc._id.toString() })
        .expect(201);

      const reabstract = await request(app.getHttpServer())
        .post(`/qc/${recordId}/reabstract`)
        .set('Authorization', `Bearer ${qcToken}`)
        .send({
          re_abstracted_values: {
            ...qcSourceRecord.record,
            patient: {
              ...(qcSourceRecord.record.patient as Record<string, unknown>),
              sex: '1',
            },
            physiology: {
              ...(qcSourceRecord.record.physiology as Record<string, unknown>),
              hr: 150,
            },
            presentation: {
              ...(qcSourceRecord.record.presentation as Record<string, unknown>),
              chief_complaint_verbatim: 'QC mismatch',
            },
          } as Record<string, unknown>,
        })
        .expect(201);

      expect(JSON.stringify(reabstract.body)).not.toContain('Synthetic complaint');
      expect(reabstract.body).not.toHaveProperty(
        'presentation.chief_complaint_verbatim',
      );

      const comparison = await request(app.getHttpServer())
        .get(`/qc/${recordId}/compare`)
        .set('Authorization', `Bearer ${qcToken}`)
        .expect(200);

      expect(comparison.body.discrepancies).toEqual(
        expect.arrayContaining([
          'patient.sex',
          'physiology.hr',
          'presentation.chief_complaint_verbatim',
        ]),
      );
      expect(comparison.body.agreement_pct).toBeLessThan(100);
    },
  );

  scenario(
    '6. QC correction return creates an audit trail and audit routes stay append-only',
    async () => {
      const pi = await createUser({
        email: 'pi-audit@example.com',
        role: 'PI',
        full_name: 'PI Audit',
      });
      const qc = await createUser({
        email: 'qc-audit@example.com',
        role: 'QC',
        full_name: 'QC Audit',
      });
      const ra = await createUser({
        email: 'ra-audit@example.com',
        role: 'RA',
        full_name: 'RA Audit',
      });
      await createActiveAssignment(ra._id, pi._id);
      const raToken = await login(ra.email, 'audit-device');
      const piToken = await login(pi.email);
      const qcToken = await login(qc.email);

      const create = await request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${raToken}`)
        .send(buildDraftPayload({ studyId: 'AUDIT-PILOT-1', mode: 'PILOT' }))
        .expect(201);
      const recordId = create.body.record._id as string;

      await request(app.getHttpServer())
        .post(`/records/${recordId}/outcome`)
        .set('Authorization', `Bearer ${raToken}`)
        .send({
          outcome24: '1',
          outcome_datetime: '2026-02-02T10:00:00.000Z',
          outcome_source: '1',
        })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/records/${recordId}/submit`)
        .set('Authorization', `Bearer ${raToken}`)
        .expect(201);
      await request(app.getHttpServer())
        .post('/qc/assign')
        .set('Authorization', `Bearer ${piToken}`)
        .send({ qc_user_id: qc._id.toString() })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/qc/${recordId}/resolve`)
        .set('Authorization', `Bearer ${qcToken}`)
        .send({
          action: 'return-to-RA',
          qc_comment: 'Please correct the heart rate',
        })
        .expect(201);

      await request(app.getHttpServer())
        .put(`/records/${recordId}`)
        .set('Authorization', `Bearer ${raToken}`)
        .send({
          physiology: { hr: 91 },
          reason: 'Corrected after QC review',
        })
        .expect(200);

      const auditEntries = await request(app.getHttpServer())
        .get(`/records/${recordId}/audit`)
        .set('Authorization', `Bearer ${piToken}`)
        .expect(200);
      const heartRateAudit = auditEntries.body.data.find(
        (entry: any) => entry.field === 'physiology.hr',
      );
      expect(heartRateAudit).toMatchObject({
        previous_value: 80,
        new_value: 91,
        changed_by: ra._id.toString(),
        reason: 'Corrected after QC review',
      });

      await request(app.getHttpServer())
        .put(`/records/${recordId}/audit`)
        .set('Authorization', `Bearer ${piToken}`)
        .send({})
        .expect(404);
      await request(app.getHttpServer())
        .delete(`/records/${recordId}/audit`)
        .set('Authorization', `Bearer ${piToken}`)
        .expect(404);
    },
  );

  scenario(
    '7. Locked records reject ordinary edits until PI reopens them with an audit reason',
    async () => {
      const pi = await createUser({
        email: 'pi-lock@example.com',
        role: 'PI',
        full_name: 'PI Lock',
      });
      const qc = await createUser({
        email: 'qc-lock@example.com',
        role: 'QC',
        full_name: 'QC Lock',
      });
      const ra = await createUser({
        email: 'ra-lock@example.com',
        role: 'RA',
        full_name: 'RA Lock',
      });
      await createActiveAssignment(ra._id, pi._id);
      const raToken = await login(ra.email, 'lock-device');
      const piToken = await login(pi.email);
      const qcToken = await login(qc.email);

      const create = await request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${raToken}`)
        .send(buildDraftPayload({ studyId: 'LOCK-PILOT-1', mode: 'PILOT' }))
        .expect(201);
      const recordId = create.body.record._id as string;

      await request(app.getHttpServer())
        .post(`/records/${recordId}/outcome`)
        .set('Authorization', `Bearer ${raToken}`)
        .send({
          outcome24: '2',
          outcome_datetime: '2026-02-03T10:00:00.000Z',
          outcome_source: '1',
        })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/records/${recordId}/submit`)
        .set('Authorization', `Bearer ${raToken}`)
        .expect(201);
      await request(app.getHttpServer())
        .post('/qc/assign')
        .set('Authorization', `Bearer ${piToken}`)
        .send({ qc_user_id: qc._id.toString() })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/qc/${recordId}/resolve`)
        .set('Authorization', `Bearer ${qcToken}`)
        .send({ action: 'verify-and-lock', qc_comment: 'Verified cleanly' })
        .expect(201);

      await request(app.getHttpServer())
        .put(`/records/${recordId}`)
        .set('Authorization', `Bearer ${raToken}`)
        .send({ physiology: { rr: 22 } })
        .expect(403);

      const reopened = await request(app.getHttpServer())
        .post(`/records/${recordId}/reopen`)
        .set('Authorization', `Bearer ${piToken}`)
        .send({ reason: 'Reopen for clarification' })
        .expect(201);
      expect(reopened.body.record.status).toBe('Returned for Correction');

      const auditEntries = await request(app.getHttpServer())
        .get(`/records/${recordId}/audit`)
        .set('Authorization', `Bearer ${piToken}`)
        .expect(200);
      const reopenAudit = auditEntries.body.data.find(
        (entry: any) =>
          entry.field === 'status' && entry.new_value === 'Returned for Correction',
      );
      expect(reopenAudit?.reason).toBe('Reopen for clarification');
    },
  );

  scenario(
    '8. Device replacement leaves synced records untouched and lets the RA resume on the new device',
    async () => {
      const pi = await createUser({
        email: 'pi-device@example.com',
        role: 'PI',
        full_name: 'PI Device',
      });
      const admin = await createUser({
        email: 'admin-device@example.com',
        role: 'ADMIN',
        full_name: 'Admin Device',
      });
      const ra = await createUser({
        email: 'ra-device@example.com',
        role: 'RA',
        full_name: 'RA Device',
      });
      await createActiveAssignment(ra._id, pi._id);

      const oldDeviceId = 'pilot-old-device';
      const newDeviceId = 'pilot-new-device';
      const raOldToken = await login(ra.email, oldDeviceId);
      const adminToken = await login(admin.email);

      await request(app.getHttpServer())
        .post('/devices/register')
        .set('Authorization', `Bearer ${raOldToken}`)
        .send({ device_id: oldDeviceId })
        .expect(201);
      await syncBatch(raOldToken, oldDeviceId, [
        buildSyncItem({
          recordNumber: 1,
          studyPrefix: 'REPLACE',
          mode: 'PILOT',
          includeOutcome: true,
        }),
      ]);

      const beforeReplacement = await recordModel.find({}).lean();
      expect(beforeReplacement).toHaveLength(1);
      expect(beforeReplacement[0].device_id).toBe(oldDeviceId);

      const devices = await request(app.getHttpServer())
        .get('/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const oldDevice = devices.body.data.find(
        (entry: any) => entry.device_id === oldDeviceId,
      );
      expect(oldDevice).toBeDefined();

      await request(app.getHttpServer())
        .post(`/devices/${oldDevice.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      await request(app.getHttpServer())
        .post('/devices/authorise-replacement')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ user_id: ra._id.toString(), device_id: newDeviceId })
        .expect(201);

      const raNewToken = await login(ra.email, newDeviceId);
      await request(app.getHttpServer())
        .post('/devices/register')
        .set('Authorization', `Bearer ${raNewToken}`)
        .send({ device_id: newDeviceId })
        .expect(201);
      await syncBatch(raNewToken, newDeviceId, [
        buildSyncItem({
          recordNumber: 2,
          studyPrefix: 'REPLACE',
          mode: 'PILOT',
          includeOutcome: true,
        }),
      ]);

      const afterReplacement = await recordModel.find({}).sort({ study_id: 1 }).lean();
      expect(afterReplacement).toHaveLength(2);
      expect(afterReplacement[0].device_id).toBe(oldDeviceId);
      expect(afterReplacement[1].device_id).toBe(newDeviceId);
    },
  );

  scenario(
    '9. Production export keeps PILOT and TRAINING out and preserves canonical columns',
    async () => {
      const pi = await createUser({
        email: 'pi-export@example.com',
        role: 'PI',
        full_name: 'PI Export',
      });
      const prodRa = await createUser({
        email: 'ra-export@example.com',
        role: 'RA',
        full_name: 'RA Export',
      });
      await createActiveAssignment(prodRa._id, pi._id);
      const piToken = await login(pi.email);
      const raToken = await login(prodRa.email, 'export-device');

      await syncBatch(raToken, 'export-device', [
        buildSyncItem({
          recordNumber: 1,
          studyPrefix: 'PROD',
          mode: 'PRODUCTION',
          includeOutcome: true,
        }),
        buildSyncItem({
          recordNumber: 2,
          studyPrefix: 'PILOT',
          mode: 'PILOT',
          includeOutcome: true,
        }),
        buildSyncItem({
          recordNumber: 3,
          studyPrefix: 'TRAIN',
          mode: 'TRAINING',
          includeOutcome: true,
        }),
      ]);

      const excluded = await createServerRecord({
        studyId: 'PROD-EXCLUDED-1',
        mode: 'PRODUCTION',
        eligible: false,
        extractorId: prodRa._id,
        deviceId: 'export-device',
      });
      await exclusionModel.create({
        research_record_id: excluded._id,
        exclusion_code: '9',
        exclusion_reason: 'Pilot exclusion test',
      });

      const csvResponse = await request(app.getHttpServer())
        .get('/export/master.csv?mode=PRODUCTION&eligible=eligible')
        .set('Authorization', `Bearer ${piToken}`)
        .expect(200);

      const csvLines = csvResponse.text.trim().split('\n');
      expect(csvLines[0]).toBe(MASTER_COLUMNS.join(','));
      expect(csvResponse.text).toContain('PROD-STUDY-1');
      expect(csvResponse.text).not.toContain('PILOT-STUDY-2');
      expect(csvResponse.text).not.toContain('TRAIN-STUDY-3');
      expect(csvResponse.text).not.toContain('PROD-EXCLUDED-1');
      expect(csvResponse.text).not.toContain('linkage_id');
      expect(csvResponse.text).not.toContain('hashed_number');
      expect(csvResponse.text).not.toContain('hospital_record_number_encrypted');

      const xlsxResponse = await request(app.getHttpServer())
        .get('/export/master.xlsx?mode=PRODUCTION&eligible=eligible')
        .set('Authorization', `Bearer ${piToken}`)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      const workbook = XLSX.read(xlsxResponse.body, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0] as string];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: null,
      });
      expect(Object.keys(rows[0] ?? {})).toEqual([...MASTER_COLUMNS]);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.study_id).toBe('PROD-STUDY-1');
      expect(rows[0]).not.toHaveProperty('linkage_id');

      for (const endpoint of [
        '/export/qc-report.xlsx',
        '/export/missing-data-report.xlsx',
        '/export/exclusion-log.xlsx',
        '/export/progress-report.xlsx',
      ]) {
        await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', `Bearer ${piToken}`)
          .buffer(true)
          .parse(binaryParser)
          .expect(200);
      }
    },
  );

  function scenario(name: string, run: () => Promise<void>) {
    it(name, async () => {
      try {
        await run();
        scenarioResults.push({ name, status: 'PASS' });
      } catch (error) {
        scenarioResults.push({
          name,
          status: 'FAIL',
          details: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    });
  }

  async function writeScenarioReport() {
    const passed = scenarioResults.filter((entry) => entry.status === 'PASS').length;
    const failed = scenarioResults.filter((entry) => entry.status === 'FAIL').length;
    const lines = [
      '# D0 Backend Scenario Report',
      '',
      `Overall: ${failed === 0 && passed === 9 ? 'PASS' : 'FAIL'}`,
      `Scenarios passed: ${passed}`,
      `Scenarios failed: ${failed}`,
      '',
      ...scenarioResults.flatMap((entry) => [
        `- ${entry.status} - ${entry.name}`,
        ...(entry.details ? [`  - Details: ${entry.details}`] : []),
      ]),
      '',
    ];
    await mkdir(join(process.cwd(), 'test-reports'), { recursive: true });
    await writeFile(REPORT_PATH, `${lines.join('\n')}\n`, 'utf8');
  }

  async function createUser({
    email,
    role,
    full_name,
  }: {
    email: string;
    role: 'RA' | 'QC' | 'PI' | 'ADMIN';
    full_name: string;
  }) {
    return userModel.create({
      _id: new Types.ObjectId(),
      email,
      password_hash: await argon2.hash('Password123!'),
      role,
      full_name,
      status: 'active',
      created_at: new Date(),
    });
  }

  async function createActiveAssignment(raId: Types.ObjectId, piId: Types.ObjectId) {
    return assignmentModel.create({
      _id: new Types.ObjectId(),
      pi_id: piId,
      ra_id: raId,
      date_range: {
        from: new Date('2026-01-01T00:00:00.000Z'),
        to: new Date('2026-12-31T23:59:59.999Z'),
      },
      register_pages: ['1-10'],
      file_ranges: ['A1-A10'],
      status: 'active',
      created_at: new Date(),
    });
  }

  async function createServerRecord({
    studyId,
    mode,
    eligible,
    extractorId,
    deviceId,
  }: {
    studyId: string;
    mode: 'PILOT' | 'TRAINING' | 'PRODUCTION';
    eligible: boolean;
    extractorId: Types.ObjectId;
    deviceId: string;
  }) {
    const record = await recordModel.create({
      client_uuid: `server-${studyId}`,
      study_id: studyId,
      status: 'Synced',
      mode,
      extractor_id: extractorId,
      abstract_date: new Date('2026-02-01T08:00:00.000Z'),
      device_id: deviceId,
      app_version: '1.0.0',
      data_dictionary_version: '1.0.0',
      version: 1,
      eligibility: {
        ed_date: new Date('2026-02-01T08:00:00.000Z'),
        ed_time: '08:00',
        triage_time: '08:10',
        age: 34,
        eligible,
        ...(eligible
          ? {}
          : {
              exclusion_code: '9',
              exclusion_reason: 'Synthetic exclusion',
            }),
      },
      patient: {
        sex: '1',
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
        sats_cat: '1',
        tews_total: 1,
        discriminator_yes: false,
        discriminator_type: '0',
        documentation_complete: true,
      },
      physiology: {
        temp: 36.5,
        hr: 80,
        rr: 18,
        sbp: 120,
        dbp: 80,
        spo2: 97,
        rbs: 6.1,
        rdt: '0',
        mobility: '1',
        avpu: '0',
        trauma: '0',
      },
      presentation: {
        chief_complaint_verbatim: 'Synthetic complaint',
        complaint_group: '1',
        multiple_complaints: false,
      },
      initial_destination: 'ED',
      process: {
        clinician_time: '08:20',
        treatment_time: '08:40',
      },
      data_quality: {
        miss_sats: false,
        miss_tews: false,
        miss_vitals: false,
        miss_outcome: false,
        source_conflict: false,
        qc_required: false,
      },
      duplicate_flags: [],
      created_at: new Date(),
      updated_at: new Date(),
    });

    await patientLinkageModel.create({
      _id: new Types.ObjectId(),
      hospital_record_number_encrypted: `enc-${studyId}`,
      hashed_number: `hash-${studyId}`,
      study_id: studyId,
    });
    await outcomeModel.create({
      research_record_id: record._id,
      outcome24: '1',
      outcome_datetime: new Date('2026-02-01T12:00:00.000Z'),
      outcome_source: '1',
      verified: false,
      verified_by: null,
      verified_at: null,
    });

    return record;
  }

  async function login(email: string, deviceId?: string) {
    const loginRequest = request(app.getHttpServer()).post('/auth/login').send({
      email,
      password: 'Password123!',
    });

    if (deviceId) {
      loginRequest.set('x-device-id', deviceId);
    }

    const response = await loginRequest.expect(201);
    return response.body.access_token as string;
  }

  function syncBatch(accessToken: string, deviceId: string, records: unknown[]) {
    return request(app.getHttpServer())
      .post('/sync/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-device-id', deviceId)
      .send({ records })
      .expect(200);
  }

  function buildDraftPayload({
    studyId,
    mode,
  }: {
    studyId: string;
    mode: 'PILOT' | 'TRAINING' | 'PRODUCTION';
  }) {
    return {
      study_id: studyId,
      mode,
      eligibility: {
        ed_date: '2026-02-01T08:00:00.000Z',
        ed_time: '08:00',
        triage_time: '08:10',
        age: 30,
        eligible: true,
      },
      patient: {
        sex: '1',
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
        sats_cat: '1',
        tews_total: 1,
        discriminator_yes: false,
        discriminator_type: '0',
        documentation_complete: true,
      },
      physiology: {
        temp: 36.5,
        hr: 80,
        rr: 18,
        sbp: 120,
        dbp: 80,
        spo2: 97,
        rbs: 6.1,
        rdt: '0',
        mobility: '1',
        avpu: '0',
        trauma: '0',
      },
      presentation: {
        chief_complaint_verbatim: 'Draft complaint',
        complaint_group: '1',
        multiple_complaints: false,
      },
      initial_destination: 'ED',
      process: {
        clinician_time: '08:20',
        treatment_time: '08:40',
      },
      data_quality: {
        miss_sats: false,
        miss_tews: false,
        miss_vitals: false,
        miss_outcome: true,
        source_conflict: false,
        qc_required: false,
      },
    };
  }

  function buildSyncItem({
    recordNumber,
    studyPrefix,
    mode,
    includeOutcome,
    hashedNumber = `hash-${studyPrefix}-${recordNumber}`,
    edDateIso = '2026-02-01T08:00:00.000Z',
    edTime = '08:00',
    age = 20 + recordNumber,
    sex = recordNumber % 2 === 0 ? '1' : '2',
  }: {
    recordNumber: number;
    studyPrefix: string;
    mode: 'PILOT' | 'TRAINING' | 'PRODUCTION';
    includeOutcome: boolean;
    hashedNumber?: string;
    edDateIso?: string;
    edTime?: string;
    age?: number;
    sex?: string;
  }) {
    const clientUuid = `client-${studyPrefix}-${recordNumber}`;
    const studyId = `${studyPrefix}-STUDY-${recordNumber}`;

    return {
      client_uuid: clientUuid,
      version: 1,
      patient_linkage: {
        hospital_record_number_encrypted: `encrypted-${studyPrefix}-${recordNumber}`,
        hashed_number: hashedNumber,
        study_id: studyId,
      },
      record: {
        study_id: studyId,
        mode,
        eligibility: {
          ed_date: edDateIso,
          ed_time: edTime,
          triage_time: '08:10',
          age,
          eligible: true,
        },
        patient: {
          sex,
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
          sats_cat: `${((recordNumber - 1) % 4) + 1}`,
          tews_total: recordNumber,
          discriminator_yes: false,
          discriminator_type: '0',
          documentation_complete: true,
        },
        physiology: {
          temp: 36.5,
          hr: 80,
          rr: 18,
          sbp: 120,
          dbp: 80,
          spo2: 97,
          rbs: 6.1,
          rdt: '0',
          mobility: '1',
          avpu: '0',
          trauma: '0',
        },
        presentation: {
          chief_complaint_verbatim: `Synthetic complaint ${recordNumber}`,
          complaint_group: '1',
          multiple_complaints: false,
        },
        initial_destination: 'ED',
        process: {
          clinician_time: '08:20',
          treatment_time: '08:40',
        },
        data_quality: {
          miss_sats: false,
          miss_tews: false,
          miss_vitals: false,
          miss_outcome: !includeOutcome,
          source_conflict: false,
          qc_required: false,
        },
      },
      ...(includeOutcome
        ? {
            outcome: {
              outcome24: `${((recordNumber - 1) % 4) + 1}`,
              outcome_datetime: '2026-02-01T12:00:00.000Z',
              outcome_source: '1',
            },
          }
        : {}),
    };
  }
});

function binaryParser(res: any, callback: (error: Error | null, body?: Buffer) => void) {
  const data: Buffer[] = [];
  res.on('data', (chunk: Buffer) => data.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(data)));
}

async function execMongoShell(port: number, script: string) {
  await new Promise<void>((resolve, reject) => {
    execFile(
      'mongosh',
      ['--host', `127.0.0.1:${port}`, '--quiet', '--eval', script],
      (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      },
    );
  });
}

async function waitForMongo(uri: string) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30000) {
    try {
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 1000,
      });
      await client.connect();
      await client.db('admin').command({ ping: 1 });
      await client.close();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error('Timed out waiting for MongoDB to start');
}
