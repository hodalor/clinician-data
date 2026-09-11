import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import {
  isAdminRole,
  isPiOrAdminRole,
  isPiRole,
} from '../../common/auth/role-access.util.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import { collectionDefinitions } from '../../common/database/collection-definitions.js';
import {
  RESEARCH_RECORD_STATUSES,
  type ResearchRecordStatus,
} from '../../common/database/schema.constants.js';
import { AssignmentModelName } from '../assignments/schemas/assignment.schema.js';
import { AuditLogModelName } from '../audit/schemas/audit-log.schema.js';
import { OutcomeModelName } from '../outcomes/schemas/outcome.schema.js';
import { UserModelName } from '../users/schemas/user.schema.js';
import { ResearchRecordModelName } from './schemas/research-record.schema.js';
import type { UpsertOutcomeDto } from './dto/upsert-outcome.dto.js';


type AssignmentRecord = {
  _id: Types.ObjectId;
  pi_id: Types.ObjectId;
  ra_id: Types.ObjectId;
  date_range: {
    from: Date;
    to: Date;
  };
  status: string;
  deleted_at?: Date | null;
};

type OutcomeRecord = {
  _id: Types.ObjectId;
  research_record_id: Types.ObjectId;
  outcome24?: string;
  outcome_datetime?: Date;
  outcome_source?: string;
};

type AuditLogRecord = {
  _id: Types.ObjectId;
  research_record_id: Types.ObjectId;
  field: string;
  previous_value: unknown;
  new_value: unknown;
  changed_by: Types.ObjectId;
  changed_at: Date;
  reason: string;
  app_version: string;
};

type UserRecord = {
  _id: Types.ObjectId;
  full_name: string;
  email: string;
  deleted_at?: Date | null;
};

type RecordListQuery = {
  assignment_id?: string;
  extractor_id?: string;
  status?: string;
  from?: string;
  to?: string;
  sats_cat?: string;
  mode?: string;
  eligible?: string;
};

const CLIENT_MANAGED_BLOCKED_FIELDS = new Set([
  '_id',
  'client_uuid',
  'status',
  'extractor_id',
  'created_at',
  'updated_at',
  'version',
]);

const EDITABLE_STATUSES = new Set<ResearchRecordStatus>([
  'Draft',
  'Returned for Correction',
  'Clinical Data Complete - Outcome Pending',
]);

const SUBMITTABLE_STATUSES = new Set<ResearchRecordStatus>([
  'Draft',
  'Returned for Correction',
  'Clinical Data Complete - Outcome Pending',
]);

const RESEARCH_RECORD_SCHEMA =
  collectionDefinitions.find(
    (definition) => definition.name === 'research_records',
  )?.validator.$jsonSchema ?? {};

@Injectable()
export class RecordsService {
  constructor(
    @InjectModel(ResearchRecordModelName)
    private readonly recordModel: Model<any>,
    @InjectModel(AssignmentModelName)
    private readonly assignmentModel: Model<AssignmentRecord>,
    @InjectModel(OutcomeModelName)
    private readonly outcomeModel: Model<OutcomeRecord>,
    @InjectModel(AuditLogModelName)
    private readonly auditLogModel: Model<AuditLogRecord>,
    @InjectModel(UserModelName)
    private readonly userModel: Model<UserRecord>,
  ) {}

  async createDraft(user: AuthenticatedUser, payload: Record<string, unknown>) {
    this.assertBodyIsObject(payload);
    this.assertNoBlockedFields(payload);
    await this.ensureRaHasActiveAssignment(user.userId);

    const now = new Date();
    const candidate = this.mergeObjects(payload, {
      client_uuid: randomUUID(),
      status: 'Draft',
      extractor_id: new Types.ObjectId(user.userId),
      device_id: user.deviceId,
      version: 1,
      created_at: now,
      updated_at: now,
      data_quality: {},
      duplicate_flags: [],
    });

    const { sanitizedRecord, warnings } = this.prepareRecordForPersistence(
      payload,
      candidate,
      true,
    );

    const createdRecord = await this.recordModel.create(sanitizedRecord);

    return {
      record: createdRecord.toObject(),
      warnings,
    };
  }

  async updateRecord(
    id: string,
    user: AuthenticatedUser,
    payload: Record<string, unknown>,
  ) {
    this.assertBodyIsObject(payload);
    this.assertNoBlockedFields(payload);

    const record = await this.getOwnedEditableRecord(id, user);
    const candidate = this.mergeObjects(record.toObject(), payload);
    candidate.updated_at = new Date();
    candidate.version = (record.version ?? 1) + 1;

    const { sanitizedRecord, warnings } = this.prepareRecordForPersistence(
      payload,
      candidate,
      false,
    );

    record.set(sanitizedRecord);
    await record.save();

    return {
      record: record.toObject(),
      warnings,
    };
  }

  async getRecordById(id: string, user: AuthenticatedUser) {
    const record = await this.findRecordById(id);
    this.assertRecordReadableByUser(record, user);

    return {
      record,
    };
  }

  async getRecordAuditHistory(id: string, user: AuthenticatedUser) {
    const record = await this.findRecordById(id);
    this.assertRecordReadableByUser(record, user);

    const entries = await this.auditLogModel
      .find({ research_record_id: this.toObjectId(id) })
      .sort({ changed_at: 1, _id: 1 })
      .lean();
    const users = await this.userModel
      .find({
        _id: { $in: entries.map((entry) => entry.changed_by).filter(Boolean) },
        deleted_at: null,
      })
      .lean();
    const userMap = new Map(
      users.map((entry) => [entry._id.toString(), entry.full_name]),
    );

    return {
      data: entries.map((entry) => ({
        id: entry._id.toString(),
        field: entry.field,
        previous_value: entry.previous_value,
        new_value: entry.new_value,
        changed_by: entry.changed_by?.toString() ?? null,
        changed_by_name: entry.changed_by
          ? (userMap.get(entry.changed_by.toString()) ?? null)
          : null,
        changed_at: entry.changed_at,
        reason: entry.reason,
        app_version: entry.app_version,
      })),
    };
  }

  async getRecords(user: AuthenticatedUser, query: RecordListQuery) {
    const filter = await this.buildListFilter(user, query);
    const records = await this.recordModel
      .find(filter)
      .sort({ updated_at: -1, created_at: -1 })
      .lean();

    return {
      data: records,
    };
  }

  async submitRecord(id: string, user: AuthenticatedUser) {
    const record = await this.getOwnedEditableRecord(id, user);

    if (!SUBMITTABLE_STATUSES.has(record.status as ResearchRecordStatus)) {
      throw new ForbiddenException(
        'Only draft or correction-stage records can be submitted',
      );
    }

    const outcome = await this.outcomeModel
      .findOne({ research_record_id: record._id })
      .lean();
    const hasCompleteOutcome = Boolean(
      outcome?.outcome24 &&
      outcome?.outcome_datetime &&
      outcome?.outcome_source,
    );

    record.status = hasCompleteOutcome
      ? 'Complete'
      : 'Clinical Data Complete - Outcome Pending';
    record.updated_at = new Date();
    record.version = (record.version ?? 1) + 1;
    record.data_quality = {
      ...(record.data_quality ?? {}),
      miss_outcome: !hasCompleteOutcome,
    };

    await record.save();

    return {
      record: record.toObject(),
      warnings: [] as string[],
    };
  }

  async upsertOutcome(
    id: string,
    user: AuthenticatedUser,
    payload: UpsertOutcomeDto,
  ) {
    const record = await this.getOwnedEditableRecord(id, user);
    const outcome24 = this.readRequiredString(payload.outcome24, 'outcome24');
    const outcomeSource = this.readRequiredString(
      payload.outcome_source,
      'outcome_source',
    );
    const outcomeDatetime = this.readDate(
      payload.outcome_datetime,
      'outcome_datetime',
    );

    await this.outcomeModel.updateOne(
      { research_record_id: record._id },
      {
        $set: {
          outcome24,
          outcome_datetime: outcomeDatetime,
          outcome_source: outcomeSource,
          verified: false,
          verified_by: null,
          verified_at: null,
        },
        $setOnInsert: {
          research_record_id: record._id,
        },
      },
      { upsert: true },
    );

    record.updated_at = new Date();
    record.version = (record.version ?? 0) + 1;
    record.data_quality = {
      ...(record.data_quality ?? {}),
      miss_outcome: false,
    };

    if (record.status === 'Clinical Data Complete - Outcome Pending') {
      record.status = 'Complete';
    }

    await record.save();

    return {
      record: record.toObject(),
      outcome: {
        outcome24,
        outcome_datetime: outcomeDatetime,
        outcome_source: outcomeSource,
      },
    };
  }

  async reopenLockedRecord(
    id: string,
    user: AuthenticatedUser,
    reason: string,
  ) {
    if (!isPiRole(user.role)) {
      throw new ForbiddenException('Only PI users may reopen locked records');
    }

    if (!this.isNonEmptyString(reason)) {
      throw new BadRequestException('reason is required');
    }

    const record = await this.recordModel
      .findOne({ _id: this.toObjectId(id), deleted_at: null })
      .exec();

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    if (record.status !== 'Locked') {
      throw new ForbiddenException('Only locked records may be reopened');
    }

    record.status = 'Returned for Correction';
    record.updated_at = new Date();
    record.version = (record.version ?? 0) + 1;
    record.data_quality = {
      ...(record.data_quality ?? {}),
      qc_required: true,
      qc_comment: reason,
    };
    await record.save();

    return {
      record: record.toObject(),
    };
  }

  async softDeleteRecord(
    id: string,
    user: AuthenticatedUser,
    reason: string,
  ) {
    if (!isPiOrAdminRole(user.role)) {
      throw new ForbiddenException(
        'Only PI and ADMIN users may delete records',
      );
    }

    if (!this.isNonEmptyString(reason)) {
      throw new BadRequestException('reason is required');
    }

    const record = await this.recordModel
      .findOne({ _id: this.toObjectId(id), deleted_at: null })
      .exec();

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    record.deleted_at = new Date();
    record.deleted_by = new Types.ObjectId(user.userId);
    record.delete_reason = reason.trim();
    await record.save();

    return {
      id: record._id.toString(),
      deleted_at: record.deleted_at,
      delete_reason: record.delete_reason,
    };
  }

  private async ensureRaHasActiveAssignment(userId: string) {
    const now = new Date();
    const activeAssignment = await this.assignmentModel
      .findOne({
        ra_id: new Types.ObjectId(userId),
        'date_range.from': { $lte: now },
        'date_range.to': { $gte: now },
        status: { $regex: /^active$/i },
        deleted_at: null,
      })
      .lean();

    if (!activeAssignment) {
      throw new ForbiddenException(
        'RA users may only create drafts while they have an active assignment',
      );
    }
  }

  private async getOwnedEditableRecord(id: string, user: AuthenticatedUser) {
    const record = await this.recordModel
      .findOne({ _id: this.toObjectId(id), deleted_at: null })
      .exec();

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    const ownerId = record.extractor_id?.toString();

    if (ownerId !== user.userId) {
      throw new ForbiddenException('You may only modify your own records');
    }

    if (record.status === 'Verified' || record.status === 'Locked') {
      throw new ForbiddenException(
        'Verified or locked records cannot be edited outside the dedicated PI reopen flow',
      );
    }

    if (!EDITABLE_STATUSES.has(record.status as ResearchRecordStatus)) {
      throw new ForbiddenException(
        `Records in status "${record.status}" cannot be edited through this endpoint`,
      );
    }

    return record;
  }

  private async findRecordById(id: string) {
    const record = await this.recordModel
      .findOne({ _id: this.toObjectId(id), deleted_at: null })
      .lean();

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    return record;
  }

  private async buildListFilter(
    user: AuthenticatedUser,
    query: RecordListQuery,
  ) {
    const filter: Record<string, unknown> = {
      deleted_at: null,
    };

    if (user.role === 'RA') {
      filter.extractor_id = new Types.ObjectId(user.userId);
    }

    if (user.role === 'QC') {
      filter['data_quality.reviewer_id'] = new Types.ObjectId(user.userId);
    }

    if (query.extractor_id) {
      const extractorId = this.toObjectId(query.extractor_id);

      if (user.role === 'RA' && extractorId.toString() !== user.userId) {
        throw new ForbiddenException(
          'RA users can only view their own records',
        );
      }

      filter.extractor_id = extractorId;
    }

    if (query.assignment_id) {
      const assignment = await this.assignmentModel
        .findOne({ _id: this.toObjectId(query.assignment_id), deleted_at: null })
        .lean();

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      if (user.role === 'RA' && assignment.ra_id.toString() !== user.userId) {
        throw new ForbiddenException(
          'RA users can only filter by their own assignments',
        );
      }
      filter.extractor_id = assignment.ra_id;
      filter['eligibility.ed_date'] = {
        $gte: assignment.date_range.from,
        $lte: assignment.date_range.to,
      };
    }

    if (query.from || query.to) {
      const existingDateFilter =
        (filter['eligibility.ed_date'] as Record<string, Date> | undefined) ??
        {};
      filter['eligibility.ed_date'] = {
        ...existingDateFilter,
        ...(query.from ? { $gte: this.readDate(query.from, 'from') } : {}),
        ...(query.to ? { $lte: this.readDate(query.to, 'to') } : {}),
      };
    }

    if (query.sats_cat) {
      filter['sats.sats_cat'] = query.sats_cat.trim();
    }

    if (query.mode) {
      filter.mode = query.mode.trim().toUpperCase();
    }

    if (query.eligible) {
      switch (query.eligible.trim().toLowerCase()) {
        case 'eligible':
          filter['eligibility.eligible'] = true;
          break;
        case 'excluded':
          filter['eligibility.eligible'] = false;
          break;
        case 'all':
          break;
        default:
          throw new BadRequestException(
            'eligible must be eligible, excluded, or all',
          );
      }
    }

    if (query.status) {
      const statuses = query.status
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      if (statuses.length === 0) {
        throw new BadRequestException('status filter cannot be empty');
      }

      const invalidStatuses = statuses.filter(
        (status) =>
          !RESEARCH_RECORD_STATUSES.includes(status as ResearchRecordStatus),
      );

      if (invalidStatuses.length > 0) {
        throw new BadRequestException(
          `Invalid record status filter: ${invalidStatuses.join(', ')}`,
        );
      }

      filter.status = { $in: statuses };
    }

    if (
      user.role === 'ADMIN' &&
      !query.assignment_id &&
      !query.status &&
      !query.extractor_id
    ) {
      throw new BadRequestException(
        'ADMIN record listing requires at least one filter',
      );
    }

    return filter;
  }

  private assertRecordReadableByUser(record: any, user: AuthenticatedUser) {
    if (isPiRole(user.role) || isAdminRole(user.role)) {
      return;
    }

    if (user.role === 'RA' && record.extractor_id?.toString() === user.userId) {
      return;
    }

    if (
      user.role === 'QC' &&
      record.data_quality?.reviewer_id?.toString() === user.userId
    ) {
      return;
    }

    throw new ForbiddenException('You are not allowed to view this record');
  }

  private readDate(value: string, fieldName: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }
    return date;
  }

  prepareRecordForPersistence(
    payload: Record<string, unknown>,
    candidate: Record<string, any>,
    isCreate: boolean,
  ) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalized = this.mergeObjects({}, candidate);

    if (isCreate) {
      if (!this.isNonEmptyString(normalized.study_id)) {
        errors.push('study_id is required');
      }

      if (!this.isNonEmptyString(normalized.mode)) {
        errors.push('mode is required');
      }
    }

    this.validateEnumField(normalized, 'status', errors);
    this.validateEnumField(normalized, 'mode', errors);
    this.validateEnumField(normalized, 'eligibility.exclusion_code', errors);
    this.validateEnumField(normalized, 'patient.sex', errors);
    this.validateEnumField(normalized, 'patient.referral', errors);
    this.validateEnumField(normalized, 'patient.comorbidities.dm', errors);
    this.validateEnumField(normalized, 'patient.comorbidities.htn', errors);
    this.validateEnumField(normalized, 'patient.comorbidities.asthma', errors);
    this.validateEnumField(normalized, 'patient.comorbidities.rvd', errors);
    this.validateEnumField(normalized, 'patient.comorbidities.other', errors);
    this.validateEnumField(normalized, 'patient.comorb_any', errors);
    this.validateEnumField(normalized, 'patient.preg_test', errors);
    this.validateEnumField(normalized, 'sats.sats_cat', errors);
    this.validateEnumField(normalized, 'sats.discriminator_type', errors);
    this.validateEnumField(normalized, 'physiology.rdt', errors);
    this.validateEnumField(normalized, 'physiology.mobility', errors);
    this.validateEnumField(normalized, 'physiology.avpu', errors);
    this.validateEnumField(normalized, 'physiology.trauma', errors);
    this.validateEnumField(normalized, 'presentation.complaint_group', errors);

    this.validateNumericField(normalized, 'physiology.spo2', errors, {
      min: 0,
      max: 100,
      label: 'SpO2',
    });
    this.validateNumericField(normalized, 'physiology.hr', errors, {
      min: 0,
      label: 'HR',
    });
    this.validateNumericField(normalized, 'physiology.rr', errors, {
      min: 0,
      label: 'RR',
    });
    this.validateNumericField(normalized, 'physiology.sbp', errors, {
      min: 0,
      label: 'SBP',
    });
    this.validateNumericField(normalized, 'physiology.dbp', errors, {
      min: 0,
      label: 'DBP',
    });
    this.validateNumericField(normalized, 'physiology.rbs', errors, {
      min: 0,
      label: 'RBS',
    });
    this.validateNumericField(normalized, 'sats.tews_total', errors, {
      min: 0,
      label: 'TEWS',
    });

    const spo2 = this.getValueAtPath(normalized, 'physiology.spo2');
    const tewsTotal = this.getValueAtPath(normalized, 'sats.tews_total');
    const vitalFields = ['temp', 'hr', 'rr', 'sbp', 'dbp', 'rbs'] as const;
    const missingAnyVitals = vitalFields.some((field) =>
      this.isNullish(this.getValueAtPath(normalized, `physiology.${field}`)),
    );

    this.ensurePath(normalized, 'data_quality', {});

    if (this.isNullish(spo2)) {
      this.setValueAtPath(normalized, 'data_quality.miss_sats', true);
    } else if (
      this.getValueAtPath(normalized, 'data_quality.miss_sats') === true
    ) {
      errors.push(
        'data_quality.miss_sats cannot be true when physiology.spo2 is present',
      );
    }

    if (this.isNullish(tewsTotal)) {
      this.setValueAtPath(normalized, 'data_quality.miss_tews', true);
    } else if (
      this.getValueAtPath(normalized, 'data_quality.miss_tews') === true
    ) {
      errors.push(
        'data_quality.miss_tews cannot be true when sats.tews_total is present',
      );
    }

    if (missingAnyVitals) {
      this.setValueAtPath(normalized, 'data_quality.miss_vitals', true);
    }

    for (const field of vitalFields) {
      const value = this.getValueAtPath(normalized, `physiology.${field}`);

      if (value === 0) {
        errors.push(
          `${field} must be null or absent when missing; 0 is not accepted as a placeholder`,
        );
      }
    }

    if (
      this.getValueAtPath(normalized, 'physiology.spo2') === 0 &&
      this.getValueAtPath(normalized, 'data_quality.miss_sats') === true
    ) {
      errors.push(
        'SpO2 must be null or absent when missing; 0 is not accepted as a placeholder',
      );
    }

    if (
      !missingAnyVitals &&
      this.getValueAtPath(normalized, 'data_quality.miss_vitals') === true
    ) {
      errors.push(
        'data_quality.miss_vitals cannot be true when all continuous vital fields are present',
      );
    }

    this.addWarningIfOutsideRange(
      normalized,
      'physiology.hr',
      warnings,
      30,
      180,
      'HR is clinically unusual',
    );
    this.addWarningIfOutsideRange(
      normalized,
      'physiology.rr',
      warnings,
      8,
      40,
      'RR is clinically unusual',
    );
    this.addWarningIfOutsideRange(
      normalized,
      'physiology.sbp',
      warnings,
      70,
      220,
      'SBP is clinically unusual',
    );
    this.addWarningIfOutsideRange(
      normalized,
      'physiology.dbp',
      warnings,
      40,
      130,
      'DBP is clinically unusual',
    );
    this.addWarningIfOutsideRange(
      normalized,
      'physiology.temp',
      warnings,
      35,
      41,
      'Temperature is clinically unusual',
    );
    this.addWarningIfOutsideRange(
      normalized,
      'physiology.rbs',
      warnings,
      3,
      20,
      'RBS is clinically unusual',
    );

    const spo2Value = this.getValueAtPath(normalized, 'physiology.spo2');

    if (typeof spo2Value === 'number' && spo2Value < 80) {
      warnings.push('SpO2 is clinically unusual');
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: errors,
      });
    }

    return {
      sanitizedRecord: normalized,
      warnings: [...new Set(warnings)],
      changed_fields: Object.keys(payload),
    };
  }

  private validateEnumField(
    candidate: Record<string, any>,
    path: string,
    errors: string[],
  ) {
    const value = this.getValueAtPath(candidate, path);

    if (this.isNullish(value)) {
      return;
    }

    const enumValues = this.getResearchRecordEnumValues(path);

    if (!enumValues) {
      return;
    }

    if (typeof value !== 'string' || !enumValues.includes(value)) {
      errors.push(`${path} must be one of: ${enumValues.join(', ')}`);
    }
  }

  private validateNumericField(
    candidate: Record<string, any>,
    path: string,
    errors: string[],
    options: { min: number; max?: number; label: string },
  ) {
    const value = this.getValueAtPath(candidate, path);

    if (this.isNullish(value)) {
      return;
    }

    if (typeof value !== 'number' || Number.isNaN(value)) {
      errors.push(`${options.label} must be a number`);
      return;
    }

    if (value < options.min) {
      errors.push(`${options.label} must be at least ${options.min}`);
    }

    if (typeof options.max === 'number' && value > options.max) {
      errors.push(`${options.label} must be at most ${options.max}`);
    }
  }

  private addWarningIfOutsideRange(
    candidate: Record<string, any>,
    path: string,
    warnings: string[],
    min: number,
    max: number,
    message: string,
  ) {
    const value = this.getValueAtPath(candidate, path);

    if (typeof value === 'number' && (value < min || value > max)) {
      warnings.push(message);
    }
  }

  private getResearchRecordEnumValues(path: string) {
    const pathSegments = path.split('.');
    let current: any = RESEARCH_RECORD_SCHEMA;

    for (const segment of pathSegments) {
      if (!current?.properties?.[segment]) {
        return null;
      }

      current = current.properties[segment];
    }

    return Array.isArray(current?.enum) ? current.enum : null;
  }

  private assertBodyIsObject(
    value: unknown,
  ): asserts value is Record<string, unknown> {
    if (!this.isPlainObject(value)) {
      throw new BadRequestException('Request body must be a JSON object');
    }
  }

  private assertNoBlockedFields(payload: Record<string, unknown>) {
    const invalidFields = Object.keys(payload).filter((key) =>
      CLIENT_MANAGED_BLOCKED_FIELDS.has(key),
    );

    if (invalidFields.length > 0) {
      throw new BadRequestException(
        `These fields are managed by the server: ${invalidFields.join(', ')}`,
      );
    }
  }

  private mergeObjects(
    base: Record<string, any>,
    patch: Record<string, any>,
  ): Record<string, any> {
    const result: Record<string, any> = { ...base };

    for (const [key, value] of Object.entries(patch)) {
      if (this.isPlainObject(value) && this.isPlainObject(result[key])) {
        result[key] = this.mergeObjects(result[key], value);
        continue;
      }

      if (Array.isArray(value)) {
        result[key] = [...value];
        continue;
      }

      result[key] = value;
    }

    return result;
  }

  private ensurePath(
    target: Record<string, any>,
    path: string,
    fallbackValue: Record<string, unknown>,
  ) {
    if (!this.isPlainObject(this.getValueAtPath(target, path))) {
      this.setValueAtPath(target, path, fallbackValue);
    }
  }

  private getValueAtPath(target: Record<string, any>, path: string) {
    return path
      .split('.')
      .reduce<any>(
        (current, key) =>
          current && typeof current === 'object' ? current[key] : undefined,
        target,
      );
  }

  private setValueAtPath(
    target: Record<string, any>,
    path: string,
    value: unknown,
  ) {
    const segments = path.split('.');
    let current = target;

    while (segments.length > 1) {
      const segment = segments.shift() as string;

      if (!this.isPlainObject(current[segment])) {
        current[segment] = {};
      }

      current = current[segment];
    }

    current[segments[0] as string] = value;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private isNonEmptyString(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private readRequiredString(value: unknown, fieldName: string) {
    if (!this.isNonEmptyString(value)) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return (value as string).trim();
  }

  private isNullish(value: unknown) {
    return value === undefined || value === null;
  }

  private toObjectId(value: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException('Invalid object id');
    }

    return new Types.ObjectId(value);
  }

  parseObjectId(value: string) {
    return this.toObjectId(value);
  }
}
