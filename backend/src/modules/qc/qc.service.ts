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
  QcAssignmentItem,
  QcDuplicateResolveDto,
  QcReabstractDto,
  QcResolveDto,
} from './dto/qc-workflow.dto.js';
import {
  assignRoundRobin,
  selectStratifiedSample,
} from './qc-assignment.util.js';
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

    this.assertSingleAssignMode(payload);

    if (payload.record_id) {
      return this.assignSingleRecord(payload);
    }

    if (payload.assignments) {
      return this.commitAssignments(payload.assignments);
    }

    if (this.isAutoAssignRequest(payload)) {
      return this.previewAutoAssignment(payload);
    }

    return this.assignSampleToReviewer(payload.qc_user_id);
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

  async getReviewSession(recordId: string, user: AuthenticatedUser) {
    const review = await this.getAssignedReview(recordId, user);
    const record = await this.recordModel
      .findById(review.research_record_id)
      .select({ status: 1, study_id: 1 })
      .lean();

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    const submitted = this.hasSubmittedReabstraction(review);

    return {
      record_id: review.research_record_id.toString(),
      record_status: record.status,
      review_status: review.status,
      reabstraction_submitted: submitted,
      ...(submitted ? { study_id: record.study_id ?? null } : {}),
    };
  }

  async compareRecord(recordId: string, user: AuthenticatedUser) {
    const review = await this.getAssignedReview(recordId, user);
    this.assertReabstractionSubmitted(review);
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
    this.assertReabstractionSubmitted(review);
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

        const correctionComment = this.readRequiredQcComment(payload);

        const candidate = {
          ...record.toObject(),
          ...payload.corrected_values,
          updated_at: new Date(),
          version: (record.version ?? 0) + 1,
          status: 'Verified',
          data_quality: {
            ...(record.data_quality ?? {}),
            qc_required: false,
            qc_comment: correctionComment,
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
      case 'return-to-RA': {
        const returnComment = this.readRequiredQcComment(payload);
        record.status = 'Returned for Correction';
        record.data_quality = {
          ...(record.data_quality ?? {}),
          qc_required: true,
          qc_comment: returnComment,
          reviewer_id: review.qc_user_id,
        };
        review.status = 'Returned to RA';
        break;
      }
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

  private async assignSingleRecord(payload: QcAssignDto) {
    if (!payload.qc_user_id) {
      throw new BadRequestException('qc_user_id is required');
    }

    if (!payload.record_id) {
      throw new BadRequestException('record_id is required');
    }

    const qcUser = await this.requireActiveQcUser(payload.qc_user_id);
    const recordId = this.recordsService.parseObjectId(payload.record_id);
    const record = await this.recordModel
      .findOne({ _id: recordId, deleted_at: null })
      .lean();

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    this.assertRecordEligibleForAssignment(record);
    await this.assertRecordHasNoReview(recordId);
    await this.writeAssignments([
      { record, qcUserId: qcUser._id },
    ]);

    return {
      assigned_count: 1,
      qc_user_id: qcUser._id.toString(),
      record_ids: [record._id.toString()],
      reviewer_count: 1,
      reviewers: [
        {
          qc_user_id: qcUser._id.toString(),
          full_name: qcUser.full_name,
          assigned_count: 1,
        },
      ],
    };
  }

  private async previewAutoAssignment(payload: QcAssignDto) {
    const percentage = this.readPercentage(payload.percentage);
    const productionOnly = payload.production_only !== false;
    const reviewers = await this.listActiveQcReviewers();
    const eligible = await this.findEligibleAssignmentRecords(productionOnly);
    const selected = selectStratifiedSample(
      eligible.map((record: RecordDocument) => ({
        extractorId: record.extractor_id?.toString() ?? 'unassigned',
        record,
      })),
      percentage,
    );
    const planned = assignRoundRobin(
      selected.map((item) => item.record as RecordDocument),
      reviewers.map((reviewer) => reviewer._id.toString()),
    );
    const reviewersById = new Map(
      reviewers.map((reviewer) => [reviewer._id.toString(), reviewer]),
    );
    const counts = new Map<string, number>();

    for (const assignment of planned) {
      counts.set(
        assignment.qcUserId,
        (counts.get(assignment.qcUserId) ?? 0) + 1,
      );
    }

    const assignedReviewers = [...counts.entries()].map(
      ([qcUserId, assignedCount]) => ({
        qc_user_id: qcUserId,
        full_name: reviewersById.get(qcUserId)?.full_name ?? 'QC reviewer',
        assigned_count: assignedCount,
      }),
    );

    return {
      dry_run: true,
      assigned_count: planned.length,
      reviewer_count: assignedReviewers.length,
      reviewers: assignedReviewers,
      assignments: planned.map((assignment) => ({
        record_id: assignment.record._id.toString(),
        qc_user_id: assignment.qcUserId,
      })),
    };
  }

  private async commitAssignments(assignments: QcAssignmentItem[]) {
    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new BadRequestException(
        'assignments must include at least one record',
      );
    }

    const seenRecordIds = new Set<string>();

    for (const assignment of assignments) {
      if (
        !assignment ||
        typeof assignment.record_id !== 'string' ||
        typeof assignment.qc_user_id !== 'string' ||
        assignment.record_id.trim().length === 0 ||
        assignment.qc_user_id.trim().length === 0
      ) {
        throw new BadRequestException(
          'Each assignment needs a record_id and qc_user_id',
        );
      }

      if (seenRecordIds.has(assignment.record_id)) {
        throw new BadRequestException('Each record can only be assigned once');
      }

      seenRecordIds.add(assignment.record_id);
    }

    const reviewerIds = [
      ...new Set(assignments.map((assignment) => assignment.qc_user_id)),
    ];
    const reviewers = await Promise.all(
      reviewerIds.map((reviewerId) => this.requireActiveQcUser(reviewerId)),
    );
    const reviewersById = new Map(
      reviewers.map((reviewer) => [reviewer._id.toString(), reviewer]),
    );
    const recordIds = assignments.map((assignment) =>
      this.recordsService.parseObjectId(assignment.record_id),
    );
    const records = await this.recordModel
      .find({ _id: { $in: recordIds }, deleted_at: null })
      .lean();
    const recordsById = new Map(
      records.map((record: RecordDocument) => [record._id.toString(), record]),
    );
    const existingReviews = await this.qcReviewModel
      .find(
        { research_record_id: { $in: recordIds } },
        { research_record_id: 1 },
      )
      .lean();

    if (existingReviews.length > 0) {
      throw new BadRequestException(
        'Some records are no longer eligible for QC assignment. Preview the selection again.',
      );
    }

    const pairs: Array<{ record: RecordDocument; qcUserId: Types.ObjectId }> =
      [];

    for (const assignment of assignments) {
      const record = recordsById.get(assignment.record_id);

      if (!record) {
        throw new BadRequestException(
          'Some records are no longer eligible for QC assignment. Preview the selection again.',
        );
      }

      try {
        this.assertRecordEligibleForAssignment(record);
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw new BadRequestException(
            'Some records are no longer eligible for QC assignment. Preview the selection again.',
          );
        }

        throw error;
      }

      const reviewer = reviewersById.get(
        this.recordsService.parseObjectId(assignment.qc_user_id).toString(),
      );

      if (!reviewer) {
        throw new BadRequestException(
          'qc_user_id must reference an active QC user',
        );
      }

      pairs.push({ record, qcUserId: reviewer._id });
    }

    await this.writeAssignments(pairs);

    const counts = new Map<string, number>();

    for (const pair of pairs) {
      const reviewerId = pair.qcUserId.toString();
      counts.set(reviewerId, (counts.get(reviewerId) ?? 0) + 1);
    }

    return {
      assigned_count: pairs.length,
      reviewer_count: counts.size,
      record_ids: pairs.map((pair) => pair.record._id.toString()),
      reviewers: [...counts.entries()].map(([qcUserId, assignedCount]) => ({
        qc_user_id: qcUserId,
        full_name: reviewersById.get(qcUserId)?.full_name ?? 'QC reviewer',
        assigned_count: assignedCount,
      })),
    };
  }

  private async assignSampleToReviewer(qcUserIdValue: string | undefined) {
    if (!qcUserIdValue) {
      throw new BadRequestException('qc_user_id is required');
    }

    const qcUser = await this.requireActiveQcUser(qcUserIdValue);
    const candidates = await this.recordModel
      .find({
        status: {
          $in: ['Complete', 'Synced', 'QC Required', 'Verified', 'Locked'],
        },
      })
      .lean();
    const reviewedIds = await this.loadReviewedRecordIds();
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

    await this.writeAssignments(
      chosenRecords.map((record) => ({
        record,
        qcUserId: qcUser._id,
      })),
    );

    return {
      assigned_count: chosenRecords.length,
      qc_user_id: qcUser._id.toString(),
      record_ids: chosenRecords.map((record) => record._id.toString()),
    };
  }

  private assertSingleAssignMode(payload: QcAssignDto) {
    const modes = [
      Boolean(payload.record_id),
      Array.isArray(payload.assignments),
      this.isAutoAssignRequest(payload),
    ].filter(Boolean);

    if (modes.length > 1) {
      throw new BadRequestException(
        'Choose one assignment mode: a single record, a preview, or a list of assignments',
      );
    }
  }

  private isAutoAssignRequest(payload: QcAssignDto) {
    return (
      payload.percentage !== undefined ||
      payload.dry_run === true ||
      payload.production_only !== undefined
    );
  }

  private readPercentage(value: number | undefined) {
    const percentage = value ?? 10;

    if (
      typeof percentage !== 'number' ||
      !Number.isInteger(percentage) ||
      percentage < 1 ||
      percentage > 100
    ) {
      throw new BadRequestException(
        'percentage must be an integer from 1 to 100',
      );
    }

    return percentage;
  }

  private async listActiveQcReviewers() {
    const reviewers = await this.userModel
      .find({ role: 'QC', status: 'active', deleted_at: null })
      .sort({ full_name: 1, _id: 1 })
      .lean();

    if (reviewers.length === 0) {
      throw new BadRequestException('No active QC reviewers are available');
    }

    return reviewers;
  }

  private async findEligibleAssignmentRecords(productionOnly: boolean) {
    const filter: Record<string, unknown> = {
      deleted_at: null,
      status: { $in: ['Complete', 'Synced'] },
      'data_quality.qc_required': { $ne: true },
    };

    if (productionOnly) {
      filter.mode = 'PRODUCTION';
    }

    const candidates = await this.recordModel.find(filter).lean();
    const reviewedIds = await this.loadReviewedRecordIds();

    return candidates.filter(
      (record: RecordDocument) => !reviewedIds.has(record._id.toString()),
    );
  }

  private async loadReviewedRecordIds() {
    const existingReviews = await this.qcReviewModel
      .find({}, { research_record_id: 1 })
      .lean();

    return new Set(
      existingReviews.map((review: { research_record_id: Types.ObjectId }) =>
        review.research_record_id.toString(),
      ),
    );
  }

  private assertRecordEligibleForAssignment(record: RecordDocument) {
    if (record.status !== 'Complete' && record.status !== 'Synced') {
      throw new BadRequestException(
        'Only Complete or Synced records can be assigned to QC',
      );
    }

    if (record.data_quality?.qc_required === true) {
      throw new BadRequestException(
        'This record is already marked QC required',
      );
    }
  }

  private async assertRecordHasNoReview(recordId: Types.ObjectId) {
    const existingReview = await this.qcReviewModel
      .findOne({ research_record_id: recordId })
      .lean();

    if (existingReview) {
      throw new BadRequestException('This record already has a QC review');
    }
  }

  private async requireActiveQcUser(qcUserIdValue: string) {
    const qcUserId = this.recordsService.parseObjectId(qcUserIdValue);
    const qcUser = await this.userModel
      .findOne({
        _id: qcUserId,
        role: 'QC',
        status: 'active',
        deleted_at: null,
      })
      .lean();

    if (!qcUser) {
      throw new BadRequestException(
        'qc_user_id must reference an active QC user',
      );
    }

    return qcUser;
  }

  private async writeAssignments(
    pairs: Array<{ record: RecordDocument; qcUserId: Types.ObjectId }>,
  ) {
    if (pairs.length === 0) {
      return;
    }

    await this.qcReviewModel.create(
      pairs.map(({ record, qcUserId }) => ({
        research_record_id: record._id,
        qc_user_id: qcUserId,
        re_abstracted_values: {},
        discrepancies: [],
        agreement_pct: 0,
        status: 'Assigned',
      })),
    );

    for (const { record, qcUserId } of pairs) {
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
  }

  private hasSubmittedReabstraction(review: {
    status?: string;
    re_abstracted_values?: unknown;
  }) {
    if (!review.status || review.status === 'Assigned') {
      return false;
    }

    return this.hasEnteredValue(review.re_abstracted_values);
  }

  private hasEnteredValue(value: unknown): boolean {
    if (value === null || value === undefined || value === '') {
      return false;
    }

    if (Array.isArray(value)) {
      return value.some((item) => this.hasEnteredValue(item));
    }

    if (this.isPlainObject(value)) {
      return Object.values(value).some((item) => this.hasEnteredValue(item));
    }

    return true;
  }

  private assertReabstractionSubmitted(review: {
    status?: string;
    re_abstracted_values?: unknown;
  }) {
    if (!this.hasSubmittedReabstraction(review)) {
      throw new BadRequestException(
        'QC re-abstraction has not been submitted',
      );
    }
  }

  private readRequiredQcComment(payload: QcResolveDto) {
    const comment = (payload.qc_comment ?? payload.reason ?? '').trim();

    if (!comment) {
      throw new BadRequestException(
        'A comment is required when correcting or returning a record',
      );
    }

    return comment;
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
