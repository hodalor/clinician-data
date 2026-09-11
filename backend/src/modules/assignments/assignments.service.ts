import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { isPiOrAdminRole, isPiRole } from '../../common/auth/role-access.util.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import { ResearchRecordModelName } from '../records/schemas/research-record.schema.js';
import { UserModelName } from '../users/schemas/user.schema.js';
import type { UpsertAssignmentDto } from './dto/upsert-assignment.dto.js';
import { AssignmentModelName } from './schemas/assignment.schema.js';

type AssignmentRecord = {
  _id: Types.ObjectId;
  pi_id: Types.ObjectId;
  ra_id: Types.ObjectId;
  date_range: {
    from: Date;
    to: Date;
  };
  register_pages: string[];
  file_ranges: string[];
  status: string;
  created_at: Date;
  deleted_at?: Date | null;
  deleted_by?: Types.ObjectId | null;
  delete_reason?: string | null;
};

type UserRecord = {
  _id: Types.ObjectId;
  email: string;
  role: string;
  full_name: string;
  status: string;
};

type ResearchRecord = {
  _id: Types.ObjectId;
  study_id: string;
  status: string;
  extractor_id?: Types.ObjectId;
  updated_at?: Date;
  created_at?: Date;
  eligibility?: {
    ed_date?: Date;
  };
};

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectModel(AssignmentModelName)
    private readonly assignmentModel: Model<AssignmentRecord>,
    @InjectModel(UserModelName)
    private readonly userModel: Model<UserRecord>,
    @InjectModel(ResearchRecordModelName)
    private readonly recordModel: Model<ResearchRecord>,
  ) {}

  async getActiveAssignment(user: AuthenticatedUser) {
    if (user.role !== 'RA') {
      throw new ForbiddenException(
        'Only RA users may request their active assignment',
      );
    }

    const now = new Date();
    const assignment = await this.assignmentModel
      .findOne({
        ra_id: new Types.ObjectId(user.userId),
        'date_range.from': { $lte: now },
        'date_range.to': { $gte: now },
        status: { $regex: /^active$/i },
        deleted_at: null,
      })
      .sort({ created_at: -1, _id: -1 })
      .lean();

    return {
      has_active_assignment: Boolean(assignment),
      assignment: assignment
        ? {
            id: assignment._id.toString(),
            date_range: assignment.date_range,
            register_pages: assignment.register_pages ?? [],
            file_ranges: assignment.file_ranges ?? [],
            status: assignment.status,
            created_at: assignment.created_at,
          }
        : null,
    };
  }

  async listAssignments(user: AuthenticatedUser) {
    this.assertPiOrAdmin(user);

    const assignments = await this.assignmentModel
      .find({ deleted_at: null })
      .sort({ created_at: -1, _id: -1 })
      .lean();

    const [usersById, progressByAssignmentId] = await Promise.all([
      this.loadUsersById(assignments),
      this.computeProgressForAssignments(assignments),
    ]);

    return {
      data: assignments.map((assignment) => {
        const progress = progressByAssignmentId.get(
          assignment._id.toString(),
        ) ?? {
          total_records: 0,
          completed_records: 0,
        };

        return {
          id: assignment._id.toString(),
          ra_id: assignment.ra_id.toString(),
          ra_name:
            usersById.get(assignment.ra_id.toString())?.full_name ??
            'Unknown RA',
          pi_id: assignment.pi_id.toString(),
          pi_name:
            usersById.get(assignment.pi_id.toString())?.full_name ??
            'Unknown PI',
          date_range: assignment.date_range,
          register_pages: assignment.register_pages ?? [],
          file_ranges: assignment.file_ranges ?? [],
          status: assignment.status,
          progress,
          created_at: assignment.created_at,
        };
      }),
    };
  }

  async getAssignmentOptions(user: AuthenticatedUser) {
    this.assertPiOrAdmin(user);

    const users = await this.userModel
      .find({
        role: { $in: ['RA', 'PI'] },
        status: 'active',
        deleted_at: null,
      })
      .sort({ full_name: 1, email: 1 })
      .lean();

    return {
      ras: users
        .filter((entry) => entry.role === 'RA')
        .map((entry) => ({
          id: entry._id.toString(),
          full_name: entry.full_name,
          email: entry.email,
        })),
      pis: users
        .filter((entry) => entry.role === 'PI')
        .map((entry) => ({
          id: entry._id.toString(),
          full_name: entry.full_name,
          email: entry.email,
        })),
    };
  }

  async getAssignmentDetail(user: AuthenticatedUser, id: string) {
    this.assertPiOrAdmin(user);

    const assignment = await this.assignmentModel
      .findOne({ _id: this.toObjectId(id), deleted_at: null })
      .lean();

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const [usersById, records] = await Promise.all([
      this.loadUsersById([assignment]),
      this.findRecordsForAssignment(assignment),
    ]);

    const completedStatuses = new Set([
      'Complete',
      'Verified',
      'Locked',
      'Synced',
    ]);
    const completedRecords = records.filter((record) =>
      completedStatuses.has(record.status),
    ).length;

    return {
      assignment: {
        id: assignment._id.toString(),
        ra_id: assignment.ra_id.toString(),
        ra_name:
          usersById.get(assignment.ra_id.toString())?.full_name ?? 'Unknown RA',
        pi_id: assignment.pi_id.toString(),
        pi_name:
          usersById.get(assignment.pi_id.toString())?.full_name ?? 'Unknown PI',
        date_range: assignment.date_range,
        register_pages: assignment.register_pages ?? [],
        file_ranges: assignment.file_ranges ?? [],
        status: assignment.status,
        progress: {
          total_records: records.length,
          completed_records: completedRecords,
        },
        created_at: assignment.created_at,
      },
      records: records.map((record) => ({
        id: record._id.toString(),
        study_id: record.study_id,
        status: record.status,
        updated_at: record.updated_at ?? record.created_at ?? null,
      })),
    };
  }

  async createAssignment(
    user: AuthenticatedUser,
    payload: UpsertAssignmentDto,
  ) {
    this.assertPiOrAdmin(user);
    const assignmentData = await this.prepareAssignmentPayload(user, payload);

    const created = await this.assignmentModel.create({
      ...assignmentData,
      created_at: new Date(),
    });

    return {
      assignment: {
        id: created._id.toString(),
        ...this.serializeAssignmentDocument(created.toObject()),
      },
    };
  }

  async updateAssignment(
    user: AuthenticatedUser,
    id: string,
    payload: UpsertAssignmentDto,
  ) {
    this.assertPiOrAdmin(user);

    const assignment = await this.assignmentModel
      .findOne({ _id: this.toObjectId(id), deleted_at: null })
      .exec();

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const assignmentData = await this.prepareAssignmentPayload(user, payload);
    assignment.pi_id = assignmentData.pi_id;
    assignment.ra_id = assignmentData.ra_id;
    assignment.date_range = assignmentData.date_range;
    assignment.register_pages = assignmentData.register_pages;
    assignment.file_ranges = assignmentData.file_ranges;
    assignment.status = assignmentData.status;
    await assignment.save();

    return {
      assignment: {
        id: assignment._id.toString(),
        ...this.serializeAssignmentDocument(assignment.toObject()),
      },
    };
  }

  async softDeleteAssignment(
    user: AuthenticatedUser,
    id: string,
    reason: string,
  ) {
    this.assertPiOrAdmin(user);
    const assignment = await this.assignmentModel
      .findOne({ _id: this.toObjectId(id), deleted_at: null })
      .exec();

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    assignment.deleted_at = new Date();
    assignment.deleted_by = new Types.ObjectId(user.userId);
    assignment.delete_reason = this.readRequiredString(reason, 'reason');
    await assignment.save();

    return {
      id: assignment._id.toString(),
      deleted_at: assignment.deleted_at,
      delete_reason: assignment.delete_reason,
    };
  }

  private assertPiOrAdmin(user: AuthenticatedUser) {
    if (!isPiOrAdminRole(user.role)) {
      throw new ForbiddenException(
        'Only PI and ADMIN users may manage assignments',
      );
    }
  }

  private async prepareAssignmentPayload(
    user: AuthenticatedUser,
    payload: UpsertAssignmentDto,
  ) {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Assignment payload is required');
    }

    const raId = this.toObjectId(
      this.readRequiredString(payload.ra_id, 'ra_id'),
    );
    const piId =
      isPiRole(user.role) && user.role !== 'SUPERADMIN'
        ? new Types.ObjectId(user.userId)
        : this.toObjectId(this.readRequiredString(payload.pi_id, 'pi_id'));
    const from = this.readRequiredDate(
      payload.date_range?.from,
      'date_range.from',
    );
    const to = this.readRequiredDate(payload.date_range?.to, 'date_range.to');

    if (from.getTime() > to.getTime()) {
      throw new BadRequestException(
        'date_range.from must be on or before date_range.to',
      );
    }

    const [raUser, piUser] = await Promise.all([
      this.userModel.findOne({ _id: raId, deleted_at: null }).lean(),
      this.userModel.findOne({ _id: piId, deleted_at: null }).lean(),
    ]);

    if (!raUser || raUser.role !== 'RA' || raUser.status !== 'active') {
      throw new BadRequestException('ra_id must reference an active RA user');
    }

    if (!piUser || piUser.role !== 'PI' || piUser.status !== 'active') {
      throw new BadRequestException('pi_id must reference an active PI user');
    }

    return {
      pi_id: piId,
      ra_id: raId,
      date_range: {
        from,
        to,
      },
      register_pages: this.readStringArray(payload.register_pages),
      file_ranges: this.readStringArray(payload.file_ranges),
      status: this.readRequiredString(payload.status, 'status'),
    };
  }

  private async computeProgressForAssignments(assignments: AssignmentRecord[]) {
    const progressByAssignmentId = new Map<
      string,
      { total_records: number; completed_records: number }
    >();

    await Promise.all(
      assignments.map(async (assignment) => {
        const records = await this.findRecordsForAssignment(assignment);
        const completedStatuses = new Set([
          'Complete',
          'Verified',
          'Locked',
          'Synced',
        ]);
        progressByAssignmentId.set(assignment._id.toString(), {
          total_records: records.length,
          completed_records: records.filter((record) =>
            completedStatuses.has(record.status),
          ).length,
        });
      }),
    );

    return progressByAssignmentId;
  }

  private async findRecordsForAssignment(assignment: AssignmentRecord) {
    const from = assignment.date_range.from;
    const to = assignment.date_range.to;

    return this.recordModel
      .find({
        extractor_id: assignment.ra_id,
        deleted_at: null,
        $or: [
          {
            'eligibility.ed_date': {
              $gte: from,
              $lte: to,
            },
          },
          {
            created_at: {
              $gte: from,
              $lte: to,
            },
          },
        ],
      })
      .sort({ updated_at: -1, created_at: -1 })
      .lean();
  }

  private async loadUsersById(assignments: AssignmentRecord[]) {
    const ids = Array.from(
      new Set(
        assignments.flatMap((assignment) => [
          assignment.ra_id.toString(),
          assignment.pi_id.toString(),
        ]),
      ),
    ).map((id) => new Types.ObjectId(id));

    const users = await this.userModel
      .find({ _id: { $in: ids }, deleted_at: null })
      .lean();
    return new Map(users.map((entry) => [entry._id.toString(), entry]));
  }

  private serializeAssignmentDocument(assignment: AssignmentRecord) {
    return {
      pi_id: assignment.pi_id.toString(),
      ra_id: assignment.ra_id.toString(),
      date_range: assignment.date_range,
      register_pages: assignment.register_pages ?? [],
      file_ranges: assignment.file_ranges ?? [],
      status: assignment.status,
      created_at: assignment.created_at,
    };
  }

  private toObjectId(value: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ObjectId: ${value}`);
    }

    return new Types.ObjectId(value);
  }

  private readRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private readStringArray(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);
  }

  private readRequiredDate(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return date;
  }
}
