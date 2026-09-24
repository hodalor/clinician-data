import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Connection, Model } from 'mongoose';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import { RecordsService } from '../records/records.service.js';
import { PatientLinkageModelName } from '../records/schemas/patient-linkage.schema.js';
import { ResearchRecordModelName } from '../records/schemas/research-record.schema.js';
import { OutcomeModelName } from '../outcomes/schemas/outcome.schema.js';
import { SyncLogModelName } from './schemas/sync-log.schema.js';
import type {
  SyncOutcomeDto,
  SyncPatientLinkageDto,
  SyncRecordItemDto,
  SyncRecordsDto,
} from './dto/sync-records.dto.js';

type SyncLogRecord = {
  _id: Types.ObjectId;
  device_id: string;
  user_id: Types.ObjectId;
  record_id: Types.ObjectId;
  timestamp: Date;
  status: string;
  error_detail?: string;
};

type PatientLinkageRecord = {
  _id: Types.ObjectId;
  hospital_record_number_encrypted?: string;
  hashed_number: string;
  study_id: string;
};

type RecordDocument = any;
type OutcomeDocument = any;

@Injectable()
export class SyncService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(ResearchRecordModelName)
    private readonly recordModel: Model<RecordDocument>,
    @InjectModel(PatientLinkageModelName)
    private readonly patientLinkageModel: Model<PatientLinkageRecord>,
    @InjectModel(OutcomeModelName)
    private readonly outcomeModel: Model<OutcomeDocument>,
    @InjectModel(SyncLogModelName)
    private readonly syncLogModel: Model<SyncLogRecord>,
    private readonly recordsService: RecordsService,
  ) {}

  async syncRecords(
    user: AuthenticatedUser,
    deviceId: string | undefined,
    payload: SyncRecordsDto,
  ) {
    if (user.role !== 'RA') {
      throw new ForbiddenException('Only RA users may sync records');
    }

    const effectiveDeviceId = this.readRequiredString(
      deviceId ?? user.deviceId ?? undefined,
      'device_id',
    );

    if (!Array.isArray(payload?.records) || payload.records.length === 0) {
      throw new BadRequestException('records must be a non-empty array');
    }

    const results = [] as Array<Record<string, unknown>>;

    for (const item of payload.records) {
      results.push(await this.processSyncItem(user, effectiveDeviceId, item));
    }

    return {
      results,
      has_conflicts: results.some((result) => result.result === 'conflict'),
      has_errors: results.some((result) => result.result === 'error'),
    };
  }

  async getCheckpoint(user: AuthenticatedUser, deviceId: string) {
    if (user.role !== 'RA') {
      throw new ForbiddenException(
        'Only RA users may request sync checkpoints',
      );
    }

    const effectiveDeviceId = this.readRequiredString(deviceId, 'device_id');
    const latestSuccess = await this.syncLogModel
      .findOne({
        user_id: new Types.ObjectId(user.userId),
        device_id: effectiveDeviceId,
        status: 'Synced',
      })
      .sort({ timestamp: -1, _id: -1 })
      .lean();

    return {
      device_id: effectiveDeviceId,
      last_successful_sync_at: latestSuccess?.timestamp ?? null,
    };
  }

  private async processSyncItem(
    user: AuthenticatedUser,
    deviceId: string,
    item: SyncRecordItemDto,
  ) {
    const clientUuid = this.readRequiredString(
      item?.client_uuid,
      'client_uuid',
    );
    const version = this.readVersion(item?.version);

    if (!item || typeof item !== 'object' || !this.isPlainObject(item.record)) {
      await this.logFailedSync(
        user.userId,
        deviceId,
        new Types.ObjectId(),
        'Sync Failed',
        'record must be a JSON object',
      );

      return {
        client_uuid: clientUuid,
        result: 'error',
        status_code: 400,
        errors: ['record must be a JSON object'],
      };
    }

    const existingRecord = await this.recordModel
      .findOne({ client_uuid: clientUuid })
      .exec();
    const logRecordId = existingRecord?._id ?? new Types.ObjectId();

    if (
      existingRecord &&
      existingRecord.extractor_id?.toString() !== user.userId
    ) {
      await this.logFailedSync(
        user.userId,
        deviceId,
        existingRecord._id,
        'Sync Failed',
        'Cannot sync a record owned by another user',
      );

      return {
        client_uuid: clientUuid,
        result: 'error',
        status_code: 403,
        errors: ['Cannot sync a record owned by another user'],
      };
    }

    if (
      existingRecord &&
      typeof existingRecord.version === 'number' &&
      existingRecord.version !== version
    ) {
      if (
        this.isEquivalentRetry(existingRecord.toObject(), item.record, version)
      ) {
        await this.logSuccessfulRetry(
          user.userId,
          deviceId,
          existingRecord._id,
        );

        return {
          client_uuid: clientUuid,
          result: 'success',
          status_code: 200,
          record_id: existingRecord._id.toString(),
          status: existingRecord.status,
        };
      }

      await this.markNeedsReviewConflict(
        existingRecord,
        user.userId,
        deviceId,
        `Version conflict: client version ${version} does not match server version ${existingRecord.version}`,
      );

      return {
        client_uuid: clientUuid,
        result: 'conflict',
        status_code: 409,
        record_id: existingRecord._id.toString(),
        errors: [
          `Version conflict: client version ${version} does not match server version ${existingRecord.version}`,
        ],
      };
    }

    try {
      const result = await this.connection.transaction(async (session) => {
        const linkage = await this.upsertPatientLinkage(
          item.patient_linkage,
          session,
        );

        const now = new Date();
        const baseRecord = existingRecord
          ? existingRecord.toObject()
          : {
              created_at: now,
              duplicate_flags: [],
              data_quality: {},
            };
        const candidate = {
          ...baseRecord,
          ...item.record,
          client_uuid: clientUuid,
          extractor_id: new Types.ObjectId(user.userId),
          device_id: deviceId,
          linkage_id: linkage?._id ?? baseRecord.linkage_id,
          status: 'Synced',
          version: version + 1,
          updated_at: now,
        };

        if (!existingRecord) {
          candidate.created_at = now;
        }

        if (
          existingRecord?.status === 'Verified' ||
          existingRecord?.status === 'Locked'
        ) {
          throw new ConflictException(
            'Verified or locked records cannot be modified through sync',
          );
        }

        const { sanitizedRecord, warnings } =
          this.recordsService.prepareRecordForPersistence(
            item.record,
            candidate,
            !existingRecord,
          );

        let persistedRecord = existingRecord;

        if (persistedRecord) {
          persistedRecord.set(sanitizedRecord);
          await persistedRecord.save({ session });
        } else {
          const [createdRecord] = await this.recordModel.create(
            [sanitizedRecord],
            {
              session,
            },
          );
          persistedRecord = createdRecord;
        }

        const hasOutcome = await this.upsertOutcome(
          persistedRecord,
          item.outcome,
          session,
        );

        if (hasOutcome) {
          persistedRecord.data_quality = {
            ...(persistedRecord.data_quality ?? {}),
            miss_outcome: false,
          };
          await persistedRecord.save({ session });
        }

        await this.applyDuplicateFlags(persistedRecord, linkage?._id, session);

        await this.syncLogModel.create(
          [
            {
              device_id: deviceId,
              user_id: new Types.ObjectId(user.userId),
              record_id: persistedRecord._id,
              timestamp: new Date(),
              status: 'Synced',
              error_detail: undefined,
            },
          ],
          { session },
        );

        return {
          client_uuid: clientUuid,
          result: 'success',
          status_code: 200,
          record_id: persistedRecord._id.toString(),
          status: persistedRecord.status,
          warnings,
        };
      });

      return result;
    } catch (error) {
      const detailedErrors = this.extractSyncErrors(error);
      const errorMessage = detailedErrors.join('\n');

      await this.logFailedSync(
        user.userId,
        deviceId,
        existingRecord?._id ?? logRecordId,
        'Sync Failed',
        errorMessage,
      );

      return {
        client_uuid: clientUuid,
        result: 'error',
        status_code:
          error instanceof BadRequestException
            ? 400
            : error instanceof ConflictException
              ? 409
              : 500,
        errors: detailedErrors,
      };
    }
  }

  private async upsertOutcome(
    record: RecordDocument,
    outcome: SyncOutcomeDto | undefined,
    session: any,
  ) {
    if (!outcome) {
      return false;
    }

    const outcome24 = this.readRequiredString(outcome.outcome24, 'outcome24');
    const outcomeSource = this.readRequiredString(
      outcome.outcome_source,
      'outcome_source',
    );
    const outcomeDatetime = this.readDate(
      outcome.outcome_datetime,
      'outcome_datetime',
    );

    const update = {
      outcome24,
      outcome_datetime: outcomeDatetime,
      outcome_source: outcomeSource,
      verified: Boolean(outcome.verified),
      verified_by: null,
      verified_at: null,
    };

    await this.outcomeModel.updateOne(
      { research_record_id: record._id },
      {
        $set: update,
        $setOnInsert: { research_record_id: record._id },
      },
      {
        upsert: true,
        session,
      },
    );

    return true;
  }

  private async upsertPatientLinkage(
    patientLinkage: SyncPatientLinkageDto | undefined,
    session: any,
  ) {
    if (!patientLinkage) {
      return null;
    }

    const hashedNumber = this.readRequiredString(
      patientLinkage.hashed_number,
      'patient_linkage.hashed_number',
    );
    const studyId = this.readRequiredString(
      patientLinkage.study_id,
      'patient_linkage.study_id',
    );

    let linkage = await this.patientLinkageModel
      .findOne({ hashed_number: hashedNumber, study_id: studyId })
      .session(session)
      .exec();

    if (linkage) {
      return linkage;
    }

    const [created] = await this.patientLinkageModel.create(
      [
        {
          hospital_record_number_encrypted:
            patientLinkage.hospital_record_number_encrypted ?? '',
          hashed_number: hashedNumber,
          study_id: studyId,
        },
      ],
      { session },
    );

    return created;
  }

  private async applyDuplicateFlags(
    record: RecordDocument,
    linkageId: Types.ObjectId | undefined,
    session: any,
  ) {
    const effectiveLinkageId = linkageId ?? record.linkage_id;

    if (!effectiveLinkageId) {
      return;
    }

    const linkage = await this.patientLinkageModel
      .findById(effectiveLinkageId)
      .session(session)
      .lean();

    if (!linkage?.hashed_number) {
      return;
    }

    const matchFilter = {
      _id: { $ne: record._id },
      eligibility: {
        $exists: true,
      },
      linkage_id: { $exists: true },
      'eligibility.ed_date': record.eligibility?.ed_date ?? null,
      'eligibility.ed_time': record.eligibility?.ed_time ?? null,
      'eligibility.age': record.eligibility?.age ?? null,
      'patient.sex': record.patient?.sex ?? null,
    };

    const candidateMatches = await this.recordModel
      .find(matchFilter)
      .session(session)
      .exec();

    for (const match of candidateMatches) {
      const matchLinkage = await this.patientLinkageModel
        .findById(match.linkage_id)
        .session(session)
        .lean();

      if (matchLinkage?.hashed_number !== linkage.hashed_number) {
        continue;
      }

      this.ensureDuplicateFlag(record, match._id);
      this.ensureDuplicateFlag(match, record._id);
      await match.save({ session });
    }

    await record.save({ session });
  }

  private ensureDuplicateFlag(
    record: RecordDocument,
    matchedRecordId: Types.ObjectId,
  ) {
    const duplicateFlags = Array.isArray(record.duplicate_flags)
      ? record.duplicate_flags
      : [];

    const exists = duplicateFlags.some(
      (flag: { matched_record_id?: Types.ObjectId }) =>
        flag.matched_record_id?.toString() === matchedRecordId.toString(),
    );

    if (!exists) {
      duplicateFlags.push({
        matched_record_id: matchedRecordId,
        basis: ['hashed_number', 'ed_date', 'ed_time', 'age', 'sex'],
        resolved: false,
      });
    }

    record.duplicate_flags = duplicateFlags;
  }

  private isEquivalentRetry(
    existingRecord: Record<string, unknown>,
    incomingRecord: Record<string, unknown>,
    submittedVersion: number,
  ) {
    return (
      existingRecord.version === submittedVersion + 1 &&
      this.recordContainsIncomingState(existingRecord, incomingRecord)
    );
  }

  private recordContainsIncomingState(
    existingValue: Record<string, unknown>,
    incomingValue: Record<string, unknown>,
  ): boolean {
    return Object.entries(incomingValue).every(([key, value]) => {
      const existingEntry = existingValue[key];

      if (this.isPlainObject(value) && this.isPlainObject(existingEntry)) {
        return this.recordContainsIncomingState(existingEntry, value);
      }

      return (
        JSON.stringify(existingEntry ?? null) === JSON.stringify(value ?? null)
      );
    });
  }

  private async markNeedsReviewConflict(
    existingRecord: RecordDocument,
    userId: string,
    deviceId: string,
    errorDetail: string,
  ) {
    await this.connection.transaction(async (session) => {
      existingRecord.status = 'Needs Review';
      existingRecord.updated_at = new Date();
      existingRecord.data_quality = {
        ...(existingRecord.data_quality ?? {}),
        qc_required: true,
      };
      await existingRecord.save({ session });

      await this.syncLogModel.create(
        [
          {
            device_id: deviceId,
            user_id: new Types.ObjectId(userId),
            record_id: existingRecord._id,
            timestamp: new Date(),
            status: 'Conflict',
            error_detail: errorDetail,
          },
        ],
        { session },
      );
    });
  }

  private async logSuccessfulRetry(
    userId: string,
    deviceId: string,
    recordId: Types.ObjectId,
  ) {
    await this.syncLogModel.create({
      device_id: deviceId,
      user_id: new Types.ObjectId(userId),
      record_id: recordId,
      timestamp: new Date(),
      status: 'Synced',
      error_detail: undefined,
    });
  }

  private async logFailedSync(
    userId: string,
    deviceId: string,
    recordId: Types.ObjectId,
    status: string,
    errorDetail: string,
  ) {
    await this.syncLogModel.create({
      device_id: deviceId,
      user_id: new Types.ObjectId(userId),
      record_id: recordId,
      timestamp: new Date(),
      status,
      error_detail: errorDetail,
    });
  }

  private extractBadRequestMessages(error: BadRequestException) {
    const response = error.getResponse();

    if (
      typeof response === 'object' &&
      response &&
      Array.isArray((response as { message?: unknown }).message)
    ) {
      return (response as { message: string[] }).message;
    }

    return [error.message];
  }

  private extractSyncErrors(error: unknown) {
    if (error instanceof BadRequestException) {
      return this.extractBadRequestMessages(error);
    }

    const schemaRules = this.readMongoSchemaRuleMessages(error);
    if (schemaRules.length > 0) {
      return schemaRules;
    }

    return [error instanceof Error ? error.message : 'Unknown sync failure'];
  }

  private readMongoSchemaRuleMessages(error: unknown) {
    const details = (error as any)?.errInfo?.details;
    const rules = details?.schemaRulesNotSatisfied;

    if (!Array.isArray(rules)) {
      return [];
    }

    const messages = rules.flatMap((rule: any) =>
      this.flattenSchemaRuleMessages(rule),
    );

    return messages
      .map((message) => message?.toString().trim())
      .filter((message): message is string => Boolean(message));
  }

  private flattenSchemaRuleMessages(rule: any, pathPrefix = ''): string[] {
    if (!rule || typeof rule !== 'object') {
      return [];
    }

    const propertyName =
      typeof rule.propertyName === 'string' ? rule.propertyName : null;
    const currentPath =
      propertyName == null
        ? pathPrefix
        : pathPrefix
          ? `${pathPrefix}.${propertyName}`
          : propertyName;

    const messages: string[] = [];

    if (
      typeof rule.description === 'string' &&
      rule.description.trim().length > 0
    ) {
      messages.push(
        currentPath.length === 0
          ? rule.description.trim()
          : `${currentPath}: ${rule.description.trim()}`,
      );
    }

    if (Array.isArray(rule.details)) {
      for (const detail of rule.details) {
        if (
          typeof detail?.reason === 'string' &&
          detail.reason.trim().length > 0
        ) {
          messages.push(
            currentPath.length === 0
              ? detail.reason.trim()
              : `${currentPath}: ${detail.reason.trim()}`,
          );
        }

        if (
          detail?.operatorName === 'enum' &&
          Array.isArray(detail?.specifiedAs?.enum)
        ) {
          const allowed = detail.specifiedAs.enum.join(', ');
          messages.push(
            currentPath.length === 0
              ? `must be one of: ${allowed}`
              : `${currentPath} must be one of: ${allowed}`,
          );
        }

        if (
          detail?.operatorName === 'bsonType' &&
          detail?.specifiedAs?.bsonType
        ) {
          const expected = Array.isArray(detail.specifiedAs.bsonType)
              ? detail.specifiedAs.bsonType.join(', ')
              : detail.specifiedAs.bsonType.toString();
          messages.push(
            currentPath.length === 0
              ? `must be of type: ${expected}`
              : `${currentPath} must be of type: ${expected}`,
          );
        }
      }
    }

    if (Array.isArray(rule.propertiesNotSatisfied)) {
      for (const nestedRule of rule.propertiesNotSatisfied) {
        messages.push(
          ...this.flattenSchemaRuleMessages(nestedRule, currentPath),
        );
      }
    }

    if (Array.isArray(rule.itemsNotSatisfied)) {
      for (const nestedRule of rule.itemsNotSatisfied) {
        messages.push(
          ...this.flattenSchemaRuleMessages(nestedRule, currentPath),
        );
      }
    }

    return [...new Set(messages)];
  }

  private readRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private readVersion(value: unknown) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
      throw new BadRequestException('version must be a positive integer');
    }

    return value;
  }

  private readDate(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid ISO date`);
    }

    return date;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }
}
