import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import argon2 from 'argon2';
import { execFile, spawn, type ChildProcess } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import { MongoClient } from 'mongodb';
import { tmpdir } from 'os';
import { join } from 'path';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import request from 'supertest';
import { DeviceModelName } from '../src/modules/devices/schemas/device.schema.js';
import { QcReviewModelName } from '../src/modules/qc/schemas/qc-review.schema.js';
import { ResearchRecordModelName } from '../src/modules/records/schemas/research-record.schema.js';
import { PatientLinkageModelName } from '../src/modules/records/schemas/patient-linkage.schema.js';
import { SyncLogModelName } from '../src/modules/sync/schemas/sync-log.schema.js';
import { UserModelName } from '../src/modules/users/schemas/user.schema.js';
import { AuditLogModelName } from '../src/modules/audit/schemas/audit-log.schema.js';

jest.setTimeout(120000);

describe('Sync and QC workflows (integration)', () => {
  let mongodProcess: ChildProcess | undefined;
  let mongoDbPath: string | undefined;
  let mongoUri: string;
  let app: INestApplication;
  let userModel: Model<any>;
  let recordModel: Model<any>;
  let deviceModel: Model<any>;
  let syncLogModel: Model<any>;
  let qcReviewModel: Model<any>;
  let patientLinkageModel: Model<any>;
  let auditLogModel: Model<any>;

  beforeAll(async () => {
    const mongoPort = 27027;
    mongoDbPath = await mkdtemp(join(tmpdir(), 'sue-backend-mongo-'));
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
      {
        stdio: 'ignore',
      },
    );
    mongoUri = `mongodb://127.0.0.1:${mongoPort}/sue_backend_test?replicaSet=rs-test`;

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

    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userModel = moduleFixture.get<Model<any>>(getModelToken(UserModelName));
    recordModel = moduleFixture.get<Model<any>>(
      getModelToken(ResearchRecordModelName),
    );
    deviceModel = moduleFixture.get<Model<any>>(getModelToken(DeviceModelName));
    syncLogModel = moduleFixture.get<Model<any>>(
      getModelToken(SyncLogModelName),
    );
    qcReviewModel = moduleFixture.get<Model<any>>(
      getModelToken(QcReviewModelName),
    );
    patientLinkageModel = moduleFixture.get<Model<any>>(
      getModelToken(PatientLinkageModelName),
    );
    auditLogModel = moduleFixture.get<Model<any>>(
      getModelToken(AuditLogModelName),
    );

    await Promise.all(
      [
        userModel,
        recordModel,
        deviceModel,
        syncLogModel,
        qcReviewModel,
        patientLinkageModel,
        auditLogModel,
      ].map((model) => model.createCollection().catch(() => undefined)),
    );
  });

  beforeEach(async () => {
    await Promise.all([
      auditLogModel.deleteMany({}),
      qcReviewModel.deleteMany({}),
      syncLogModel.deleteMany({}),
      recordModel.deleteMany({}),
      patientLinkageModel.deleteMany({}),
      deviceModel.deleteMany({}),
      userModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await app?.close();
    if (mongodProcess) {
      mongodProcess.kill('SIGTERM');
    }
    if (mongoDbPath) {
      await rm(mongoDbPath, { recursive: true, force: true });
    }
  });

  it('handles a four-device offline sync scenario with 40 unique records', async () => {
    const ras = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        createUser({
          email: `ra${index + 1}@example.com`,
          role: 'RA',
          full_name: `RA ${index + 1}`,
        }),
      ),
    );

    for (const [index, ra] of ras.entries()) {
      const deviceId = `ra-device-${index + 1}`;
      const accessToken = await login(ra.email, deviceId);
      const records = Array.from({ length: 10 }, (_, recordIndex) =>
        buildSyncRecord({
          recordNumber: index * 10 + recordIndex + 1,
          studyPrefix: `RA${index + 1}`,
        }),
      );

      const response = await request(app.getHttpServer())
        .post('/sync/records')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-device-id', deviceId)
        .send({ records })
        .expect(200);

      expect(response.body.results).toHaveLength(10);
      expect(
        response.body.results.every(
          (result: { result: string }) => result.result === 'success',
        ),
      ).toBe(true);
    }

    expect(await recordModel.countDocuments()).toBe(40);
  });

  it('rejects a version conflict and routes the record to Needs Review', async () => {
    const ra = await createUser({
      email: 'conflict-ra@example.com',
      role: 'RA',
      full_name: 'Conflict RA',
    });
    const accessToken = await login(ra.email, 'conflict-device');
    const initialRecord = buildSyncRecord({
      recordNumber: 1,
      studyPrefix: 'CONFLICT',
    });

    await request(app.getHttpServer())
      .post('/sync/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-device-id', 'conflict-device')
      .send({ records: [initialRecord] })
      .expect(200);

    const conflictResponse = await request(app.getHttpServer())
      .post('/sync/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-device-id', 'conflict-device')
      .send({
        records: [
          {
            ...initialRecord,
            record: {
              ...initialRecord.record,
              presentation: {
                ...initialRecord.record.presentation,
                chief_complaint_verbatim: 'Changed offline complaint',
              },
            },
          },
        ],
      })
      .expect(200);

    expect(conflictResponse.body.results[0].status_code).toBe(409);

    const persisted = await recordModel.findOne({
      client_uuid: initialRecord.client_uuid,
    });

    expect(persisted.status).toBe('Needs Review');
  });

  it('treats an idempotent retry as a single synced record', async () => {
    const ra = await createUser({
      email: 'retry-ra@example.com',
      role: 'RA',
      full_name: 'Retry RA',
    });
    const accessToken = await login(ra.email, 'retry-device');
    const syncRecord = buildSyncRecord({
      recordNumber: 2,
      studyPrefix: 'RETRY',
    });

    await request(app.getHttpServer())
      .post('/sync/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-device-id', 'retry-device')
      .send({ records: [syncRecord] })
      .expect(200);

    await request(app.getHttpServer())
      .post('/sync/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-device-id', 'retry-device')
      .send({ records: [syncRecord] })
      .expect(200);

    expect(
      await recordModel.countDocuments({ client_uuid: syncRecord.client_uuid }),
    ).toBe(1);
  });

  it('keeps QC re-abstraction blind and does not leak RA values', async () => {
    const ra = await createUser({
      email: 'blind-ra@example.com',
      role: 'RA',
      full_name: 'Blind RA',
    });
    const qc = await createUser({
      email: 'blind-qc@example.com',
      role: 'QC',
      full_name: 'Blind QC',
    });
    const pi = await createUser({
      email: 'blind-pi@example.com',
      role: 'PI',
      full_name: 'Blind PI',
    });
    const raToken = await login(ra.email, 'blind-device');
    const piToken = await login(pi.email);
    const qcToken = await login(qc.email);
    const syncRecord = buildSyncRecord({
      recordNumber: 3,
      studyPrefix: 'BLIND',
    });

    const syncResponse = await request(app.getHttpServer())
      .post('/sync/records')
      .set('Authorization', `Bearer ${raToken}`)
      .set('x-device-id', 'blind-device')
      .send({ records: [syncRecord] })
      .expect(200);
    const recordId = syncResponse.body.results[0].record_id as string;

    await request(app.getHttpServer())
      .post('/qc/assign')
      .set('Authorization', `Bearer ${piToken}`)
      .send({ qc_user_id: qc.id.toString() })
      .expect(201);

    const reabstractResponse = await request(app.getHttpServer())
      .post(`/qc/${recordId}/reabstract`)
      .set('Authorization', `Bearer ${qcToken}`)
      .send({
        re_abstracted_values: {
          presentation: {
            chief_complaint_verbatim: 'QC independent complaint',
          },
        },
      })
      .expect(201);

    expect(reabstractResponse.body).not.toHaveProperty(
      'presentation.chief_complaint_verbatim',
    );
    expect(JSON.stringify(reabstractResponse.body)).not.toContain(
      syncRecord.record.presentation.chief_complaint_verbatim,
    );
  });

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

  function buildSyncRecord({
    recordNumber,
    studyPrefix,
  }: {
    recordNumber: number;
    studyPrefix: string;
  }) {
    const clientUuid = `client-${studyPrefix}-${recordNumber}`;
    const studyId = `${studyPrefix}-STUDY-${recordNumber}`;

    return {
      client_uuid: clientUuid,
      version: 1,
      patient_linkage: {
        hospital_record_number_encrypted: `encrypted-${studyPrefix}-${recordNumber}`,
        hashed_number: `hash-${studyPrefix}-${recordNumber}`,
        study_id: studyId,
      },
      record: {
        study_id: studyId,
        mode: 'TRAINING',
        eligibility: {
          ed_date: new Date('2026-01-01T08:00:00.000Z').toISOString(),
          ed_time: '08:00',
          triage_time: '08:10',
          age: 20 + recordNumber,
          eligible: true,
        },
        patient: {
          sex: recordNumber % 2 === 0 ? '1' : '2',
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
      },
    };
  }
});

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
