import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { isPiRole, isQcOrPiRole } from '../../common/auth/role-access.util.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import { RecordsService } from '../records/records.service.js';
import { ResearchRecordModelName } from '../records/schemas/research-record.schema.js';
import { OutcomeModelName } from '../outcomes/schemas/outcome.schema.js';
import { UserModelName } from '../users/schemas/user.schema.js';
import type {
  QcAssignDto,
  QcDuplicateResolveDto,
  QcReabstractDto,
  QcResolveDto,
} from './dto/qc-workflow.dto.js';
import { buildQcComparison } from './qc-comparison.util.js';
import { QcReviewModelName } from './schemas/qc-review.schema.js';

type UserRecord = {
  _id: Types.ObjectId;
  role: string;
  status: string;
  full_name: string;
};

type QcReviewRecord = any;
type RecordDocument = any;
type OutcomeRecord = {
  _id: Types.ObjectId;
  research_record_id: Types.ObjectId;
  outcome24?: string;
  outcome_datetime?: Date;
  outcome_source?: string;
  verified?: boolean;
};

@Injectable()
export class QcService {
  constructor(
    @InjectModel(ResearchRecordModelName)
    private readonly recordModel: Model<RecordDocument>,
    @InjectModel(QcReviewModelName)
    private readonly qcReviewModel: Model<QcReviewRecord>,
    @InjectModel(OutcomeModelName)
    private readonly outcomeModel: Model<OutcomeRecord>,
    @InjectModel(UserModelName)
    private readonly userModel: Model<UserRecord>,
    private readonly recordsService: RecordsService,
  ) {}

  async assignRecords(user: AuthenticatedUser, payload: QcAssignDto) {
    if (!isPiRole(user.role)) {
      throw new ForbiddenException('Only PI users may assign QC reviews');
    }

    const qcUserId = this.recordsService.parseObjectId(payload.qc_user_id);
    const qcUser = await this.userModel.findById(qcUserId).lean();

    if (!qcUser || qcUser.role !== 'QC' || qcUser.status !== 'active') {
      throw new BadRequestException(
        'qc_user_id must reference an active QC user',
      );
    }

    const candidates = await this.recordModel
      .find({
        status: {
          $in: ['Complete', 'Synced', 'QC Required', 'Verified', 'Locked'],
        },
      })
      .lean();
    const existingReviews = await this.qcReviewModel
      .find({}, { research_record_id: 1 })
      .lean();
    const reviewedIds = new Set(
      existingReviews.map((review: { research_record_id: Types.ObjectId }) =>
        review.research_record_id.toString(),
      ),
    );
    const unreviewedCandidates = candidates.filter(
      (record: RecordDocument) => !reviewedIds.has(record._id.toString()),
    );
    const groups = new Map<string, RecordDocument[]>();

    for (const record of unreviewedCandidates) {
      const extractorId = record.extractor_id?.toString() ?? 'unassigned';
      groups.set(extractorId, [...(groups.get(extractorId) ?? []), record]);
    }

    const selected: RecordDocument[] = [];

    for (const groupRecords of groups.values()) {
      const targetCount = Math.max(1, Math.round(groupRecords.length * 0.1));
      const shuffled = [...groupRecords].sort(() => Math.random() - 0.5);
      selected.push(
        ...shuffled.slice(0, Math.min(targetCount, shuffled.length)),
      );
    }

    const uniqueSelections = new Map(
      selected.map((record) => [record._id.toString(), record]),
    );
    const chosenRecords = [...uniqueSelections.values()];

    if (chosenRecords.length === 0) {
      return {
        assigned_count: 0,
        record_ids: [],
      };
    }

    await this.qcReviewModel.create(
      chosenRecords.map((record) => ({
        research_record_id: record._id,
        qc_user_id: qcUserId,
        re_abstracted_values: {},
        discrepancies: [],
        agreement_pct: 0,
        status: 'Assigned',
      })),
    );

    for (const record of chosenRecords) {
      await this.recordModel.updateOne(
        { _id: record._id },
        {
          $set: {
            'data_quality.qc_required': true,
            'data_quality.reviewer_id': qcUserId,
            updated_at: new Date(),
            status: 'QC Required',
            version: (record.version ?? 0) + 1,
          },
        },
      );
    }

    return {
      assigned_count: chosenRecords.length,
      qc_user_id: qcUserId.toString(),
      record_ids: chosenRecords.map((record) => record._id.toString()),
    };
  }

  async submitReabstractedValues(
    user: AuthenticatedUser,
    recordId: string,
    payload: QcReabstractDto,
  ) {
    const review = await this.getAssignedReview(recordId, user);

    if (
      !payload ||
      typeof payload !== 'object' ||
      !this.isPlainObject(payload.re_abstracted_values)
    ) {
      throw new BadRequestException('re_abstracted_values must be an object');
    }

    review.re_abstracted_values = payload.re_abstracted_values;
    review.status = 'Reabstracted';
    await review.save();

    return {
      research_record_id: review.research_record_id.toString(),
      qc_user_id: review.qc_user_id.toString(),
      status: review.status,
      submitted: true,
    };
  }

  async compareRecord(recordId: string, user: AuthenticatedUser) {
    const review = await this.getAssignedReview(recordId, user);
    const targetRecordId = this.recordsService.parseObjectId(recordId);
    const [record, outcome] = await Promise.all([
      this.recordModel.findById(targetRecordId).lean(),
      this.outcomeModel
        .findOne({ research_record_id: targetRecordId })
        .lean(),
    ]);

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    const comparison = buildQcComparison(
      {
        ...record,
        outcome24: outcome?.outcome24 ?? null,
        outcome_datetime: outcome?.outcome_datetime ?? null,
        outcome_source: outcome?.outcome_source ?? null,
        outcome_verified: outcome?.verified ?? false,
      },
      review.re_abstracted_values ?? {},
    );

    await this.qcReviewModel.updateOne(
      { _id: review._id },
      {
        $set: {
          agreement_pct: comparison.agreement_pct,
          discrepancies: comparison.discrepancies,
          status: 'Compared',
        },
      },
    );

    return comparison;
  }

  async resolveRecord(
    user: AuthenticatedUser,
    recordId: string,
    payload: QcResolveDto,
  ) {
    const review = await this.getAssignedReview(recordId, user);
    const record = await this.recordModel
      .findById(this.recordsService.parseObjectId(recordId))
      .exec();

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    review.re_abstracted_values = review.re_abstracted_values ?? {};

    switch (payload.action) {
      case 'approve':
        record.status = 'Verified';
        record.data_quality = {
          ...(record.data_quality ?? {}),
          qc_required: false,
          qc_comment: payload.qc_comment ?? null,
          reviewer_id: review.qc_user_id,
        };
        review.status = 'Approved';
        break;
      case 'correct': {
        if (!this.isPlainObject(payload.corrected_values)) {
          throw new BadRequestException(
            'corrected_values is required when action is correct',
          );
        }

        const candidate = {
          ...record.toObject(),
          ...payload.corrected_values,
          updated_at: new Date(),
          version: (record.version ?? 0) + 1,
          status: 'Verified',
          data_quality: {
            ...(record.data_quality ?? {}),
            qc_required: false,
            qc_comment: payload.qc_comment ?? null,
            reviewer_id: review.qc_user_id,
          },
        };
        const { sanitizedRecord } =
          this.recordsService.prepareRecordForPersistence(
            payload.corrected_values,
            candidate,
            false,
          );
        record.set(sanitizedRecord);
        review.status = 'Corrected';
        break;
      }
      case 'return-to-RA':
        record.status = 'Returned for Correction';
        record.data_quality = {
          ...(record.data_quality ?? {}),
          qc_required: true,
          qc_comment: payload.qc_comment ?? payload.reason ?? null,
          reviewer_id: review.qc_user_id,
        };
        review.status = 'Returned to RA';
        break;
      case 'verify-and-lock':
        record.status = 'Locked';
        record.data_quality = {
          ...(record.data_quality ?? {}),
          qc_required: false,
          qc_comment: payload.qc_comment ?? null,
          reviewer_id: review.qc_user_id,
        };
        review.status = 'Verified and Locked';
        break;
      default:
        throw new BadRequestException('Unsupported QC resolve action');
    }

    record.updated_at = new Date();
    record.version = (record.version ?? 0) + 1;
    await record.save();
    await review.save();

    return {
      research_record_id: record._id.toString(),
      qc_review_status: review.status,
      record_status: record.status,
    };
  }

  async listDuplicateQueue(user: AuthenticatedUser) {
    if (!isQcOrPiRole(user.role)) {
      throw new ForbiddenException('Only QC and PI users may view duplicates');
    }

    const records = await this.recordModel
      .find({ 'duplicate_flags.resolved': false })
      .lean();

    return {
      data: records.map((record: RecordDocument) => ({
        record_id: record._id.toString(),
        study_id: record.study_id,
        duplicate_flags: record.duplicate_flags.filter(
          (flag: { resolved: boolean }) => flag.resolved === false,
        ),
      })),
    };
  }

  async resolveDuplicate(
    user: AuthenticatedUser,
    recordId: string,
    payload: QcDuplicateResolveDto,
  ) {
    if (!isQcOrPiRole(user.role)) {
      throw new ForbiddenException(
        'Only QC and PI users may resolve duplicates',
      );
    }

    const sourceRecordId = this.recordsService.parseObjectId(recordId);
    const matchedRecordId = this.recordsService.parseObjectId(
      payload.matched_record_id,
    );
    const records = await this.recordModel
      .find({ _id: { $in: [sourceRecordId, matchedRecordId] } })
      .exec();

    if (records.length !== 2) {
      throw new NotFoundException('Duplicate record pair not found');
    }

    for (const record of records) {
      record.duplicate_flags = (record.duplicate_flags ?? []).map(
        (flag: { matched_record_id?: Types.ObjectId; resolved?: boolean }) =>
          flag.matched_record_id?.toString() ===
          (record._id.toString() === sourceRecordId.toString()
            ? matchedRecordId.toString()
            : sourceRecordId.toString())
            ? { ...flag, resolved: true }
            : flag,
      );
      record.updated_at = new Date();
      await record.save();
    }

    return {
      resolved: true,
      record_id: sourceRecordId.toString(),
      matched_record_id: matchedRecordId.toString(),
    };
  }

  private async getAssignedReview(recordId: string, user: AuthenticatedUser) {
    if (!isQcOrPiRole(user.role)) {
      throw new ForbiddenException(
        'Only QC and PI users may access QC reviews',
      );
    }

    const review = await this.qcReviewModel
      .findOne({
        research_record_id: this.recordsService.parseObjectId(recordId),
      })
      .exec();

    if (!review) {
      throw new NotFoundException('QC review not found for this record');
    }

    if (user.role === 'QC' && review.qc_user_id.toString() !== user.userId) {
      throw new ForbiddenException(
        'This QC review is assigned to another user',
      );
    }

    return review;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }
}
