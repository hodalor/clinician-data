import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { isAdminRole, isPiRole } from '../../common/auth/role-access.util.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import { ResearchRecordModelName } from '../records/schemas/research-record.schema.js';
import { UserModelName } from '../users/schemas/user.schema.js';
import { AuditLogModelName } from './schemas/audit-log.schema.js';

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
};

type ResearchRecord = {
  _id: Types.ObjectId;
  study_id: string;
};

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLogModelName)
    private readonly auditLogModel: Model<AuditLogRecord>,
    @InjectModel(UserModelName)
    private readonly userModel: Model<UserRecord>,
    @InjectModel(ResearchRecordModelName)
    private readonly recordModel: Model<ResearchRecord>,
  ) {}

  async listAuditLogs(
    user: AuthenticatedUser,
    query: Record<string, string | undefined>,
  ) {
    this.assertPiOrAdmin(user);

    const filter: Record<string, unknown> = {};

    if (query.record_id) {
      filter.research_record_id = this.toObjectId(query.record_id, 'record_id');
    }

    if (query.field) {
      filter.field = query.field.trim();
    }

    if (query.changed_by) {
      filter.changed_by = this.toObjectId(query.changed_by, 'changed_by');
    }

    if (query.from || query.to) {
      filter.changed_at = {
        ...(query.from ? { $gte: this.readDate(query.from, 'from') } : {}),
        ...(query.to ? { $lte: this.readDate(query.to, 'to') } : {}),
      };
    }

    const candidateEntries = await this.auditLogModel
      .find(filter)
      .sort({ changed_at: -1, _id: -1 })
      .lean();

    const recordIds = candidateEntries.map((entry) => entry.research_record_id);
    const userIds = candidateEntries.map((entry) => entry.changed_by);

    const [records, users] = await Promise.all([
      this.recordModel.find({ _id: { $in: recordIds } }).lean(),
      this.userModel.find({ _id: { $in: userIds } }).lean(),
    ]);

    const recordMap = new Map(
      records.map((record) => [record._id.toString(), record.study_id]),
    );
    const userMap = new Map(
      users.map((entry) => [entry._id.toString(), entry.full_name]),
    );

    const filteredEntries = query.study_id
      ? candidateEntries.filter(
          (entry) =>
            recordMap.get(entry.research_record_id.toString()) === query.study_id,
        )
      : candidateEntries;

    return {
      data: filteredEntries.map((entry) => ({
        id: entry._id.toString(),
        research_record_id: entry.research_record_id.toString(),
        study_id: recordMap.get(entry.research_record_id.toString()) ?? null,
        field: entry.field,
        previous_value: entry.previous_value,
        new_value: entry.new_value,
        changed_by: entry.changed_by.toString(),
        changed_by_name: userMap.get(entry.changed_by.toString()) ?? null,
        changed_at: entry.changed_at,
        reason: entry.reason,
        app_version: entry.app_version,
      })),
    };
  }

  private assertPiOrAdmin(user: AuthenticatedUser) {
    if (!isPiRole(user.role) && !isAdminRole(user.role)) {
      throw new ForbiddenException('Only PI and ADMIN users may view audit logs');
    }
  }

  private toObjectId(value: string, fieldName: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${fieldName} must be a valid object id`);
    }

    return new Types.ObjectId(value);
  }

  private readDate(value: string, fieldName: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return date;
  }
}
