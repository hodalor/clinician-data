import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import * as XLSX from 'xlsx';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import { buildQcComparison } from '../qc/qc-comparison.util.js';
import { collectionDefinitions } from '../../common/database/collection-definitions.js';
import { ExclusionModelName } from '../records/schemas/exclusion.schema.js';
import { QcReviewModelName } from '../qc/schemas/qc-review.schema.js';
import { ResearchRecordModelName } from '../records/schemas/research-record.schema.js';
import { UserModelName } from '../users/schemas/user.schema.js';
import { ExportLogModelName } from './schemas/export-log.schema.js';

type ExportFilters = {
  status?: string;
  from?: string;
  to?: string;
  sats_cat?: string;
  ra?: string;
  mode?: string;
  eligible?: string;
};

const MASTER_COLUMNS = [
  'study_id',
  'ed_date',
  'ed_time',
  'triage_time',
  'age',
  'sex',
  'referral',
  'referring_health_center',
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
  'disposition',
  'lmuth_called_time',
  'treatment_initiated_time',
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

@Injectable()
export class ExportService {
  constructor(
    @InjectModel(ResearchRecordModelName)
    private readonly recordModel: Model<any>,
    @InjectModel(QcReviewModelName)
    private readonly qcReviewModel: Model<any>,
    @InjectModel(UserModelName)
    private readonly userModel: Model<any>,
    @InjectModel(ExclusionModelName)
    private readonly exclusionModel: Model<any>,
    @InjectModel(ExportLogModelName)
    private readonly exportLogModel: Model<any>,
  ) {}

  async logExportAction(
    user: AuthenticatedUser,
    endpoint: string,
    filters: Record<string, string | undefined>,
  ) {
    await this.exportLogModel.create({
      user_id: new Types.ObjectId(user.userId),
      role: user.role,
      endpoint,
      filters,
      created_at: new Date(),
    });
  }

  async getMasterRows(filters: ExportFilters) {
    const match = this.buildRecordMatch(filters);

    return this.recordModel.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'outcomes',
          localField: '_id',
          foreignField: 'research_record_id',
          as: 'outcomes',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'data_quality.reviewer_id',
          foreignField: '_id',
          as: 'qc_reviewer_user',
        },
      },
      {
        $unwind: {
          path: '$outcomes',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$qc_reviewer_user',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          study_id: '$study_id',
          ed_date: '$eligibility.ed_date',
          ed_time: '$eligibility.ed_time',
          triage_time: '$eligibility.triage_time',
          age: '$eligibility.age',
          sex: '$patient.sex',
          referral: '$patient.referral',
          referring_health_center: '$patient.referring_health_center',
          dm: '$patient.comorbidities.dm',
          htn: '$patient.comorbidities.htn',
          asthma: '$patient.comorbidities.asthma',
          rvd: '$patient.comorbidities.rvd',
          other_comorb: '$patient.comorbidities.other',
          comorb_any: '$patient.comorb_any',
          preg_test: '$patient.preg_test',
          temp: '$physiology.temp',
          hr: '$physiology.hr',
          rr: '$physiology.rr',
          sbp: '$physiology.sbp',
          dbp: '$physiology.dbp',
          spo2: '$physiology.spo2',
          rbs: '$physiology.rbs',
          rdt: '$physiology.rdt',
          mobility: '$physiology.mobility',
          avpu: '$physiology.avpu',
          trauma: '$physiology.trauma',
          tews_total: '$sats.tews_total',
          complaint_text: '$presentation.chief_complaint_verbatim',
          complaint_group: '$presentation.complaint_group',
          multiple_complaint: '$presentation.multiple_complaints',
          discriminator_yes: '$sats.discriminator_yes',
          discriminator_type: '$sats.discriminator_type',
          sats_cat: '$sats.sats_cat',
          disposition: '$initial_destination',
          lmuth_called_time: '$process.clinician_time',
          treatment_initiated_time: '$process.treatment_time',
          outcome24: '$outcomes.outcome24',
          outcome_datetime: '$outcomes.outcome_datetime',
          outcome_source: '$outcomes.outcome_source',
          outcome_verified: '$outcomes.verified',
          sats_complete: '$sats.documentation_complete',
          miss_sats: '$data_quality.miss_sats',
          miss_tews: '$data_quality.miss_tews',
          miss_vitals: '$data_quality.miss_vitals',
          miss_outcome: '$data_quality.miss_outcome',
          source_conflict: '$data_quality.source_conflict',
          qc_verified: {
            $in: ['$status', ['Verified', 'Locked']],
          },
          qc_reviewer: '$qc_reviewer_user.full_name',
        },
      },
    ]);
  }

  async getMasterCsv(filters: ExportFilters) {
    const rows = await this.getMasterRows(filters);
    const header = MASTER_COLUMNS.join(',');
    const lines = rows.map((row: Record<string, unknown>) =>
      MASTER_COLUMNS.map((column) => this.escapeCsvValue(row[column])).join(
        ',',
      ),
    );

    return [header, ...lines].join('\n');
  }

  async getMasterXlsx(filters: ExportFilters) {
    const rows = await this.getMasterRows(filters);
    return this.buildWorkbookBuffer(
      'master',
      rows,
      MASTER_COLUMNS as unknown as string[],
    );
  }

  async getCodebookXlsx() {
    const researchRecordSchema = collectionDefinitions.find(
      (definition) => definition.name === 'research_records',
    )?.validator.$jsonSchema;
    const outcomeSchema = collectionDefinitions.find(
      (definition) => definition.name === 'outcomes',
    )?.validator.$jsonSchema;
    const rows = [
      ...this.schemaToCodebookRows(researchRecordSchema, ''),
      ...this.schemaToCodebookRows(outcomeSchema, ''),
    ];

    return this.buildWorkbookBuffer('codebook', rows, [
      'variable',
      'label',
      'type',
      'coding',
      'notes',
    ]);
  }

  async getQcReportXlsx(filters: ExportFilters) {
    const report = await this.getQcReport(filters);
    return this.buildWorkbookBufferFromSheets([
      {
        sheetName: 'summary',
        rows: [{ agreement_pct: report.agreement_pct }],
        columns: ['agreement_pct'],
      },
      {
        sheetName: 'categorical',
        rows: report.categorical_comparison_table,
        columns: ['record_id', 'field', 'ra_value', 'qc_value', 'matches'],
      },
      {
        sheetName: 'numeric',
        rows: report.numeric_difference_output,
        columns: ['record_id', 'field', 'ra_value', 'qc_value', 'difference'],
      },
    ]);
  }

  async getQcReport(filters: ExportFilters) {
    const match = this.buildRecordMatch(filters);
    const reviews = await this.qcReviewModel.find({}).lean();
    const categoricalRows: Array<Record<string, unknown>> = [];
    const numericRows: Array<Record<string, unknown>> = [];
    let agreementTotal = 0;
    let agreementCount = 0;

    for (const review of reviews) {
      const record = await this.recordModel
        .findOne({ _id: review.research_record_id, ...match })
        .lean();

      if (!record) {
        continue;
      }

      const comparison = buildQcComparison(
        record,
        review.re_abstracted_values ?? {},
      );
      agreementTotal += comparison.agreement_pct;
      agreementCount += 1;

      for (const row of comparison.comparisons) {
        if (row.value_type === 'categorical') {
          categoricalRows.push({
            record_id: review.research_record_id.toString(),
            field: row.field,
            ra_value: row.ra_value,
            qc_value: row.qc_value,
            matches: row.matches,
          });
        }

        if (row.value_type === 'numeric') {
          const raValue =
            typeof row.ra_value === 'number' ? row.ra_value : null;
          const qcValue =
            typeof row.qc_value === 'number' ? row.qc_value : null;
          numericRows.push({
            record_id: review.research_record_id.toString(),
            field: row.field,
            ra_value: raValue,
            qc_value: qcValue,
            difference:
              raValue !== null && qcValue !== null ? qcValue - raValue : null,
          });
        }
      }
    }

    return {
      agreement_pct:
        agreementCount === 0
          ? 0
          : Number((agreementTotal / agreementCount).toFixed(2)),
      categorical_comparison_table: categoricalRows,
      numeric_difference_output: numericRows,
    };
  }

  async getMissingDataReportXlsx(filters: ExportFilters) {
    const report = await this.getMissingDataReport(filters);
    return this.buildWorkbookBufferFromSheets([
      {
        sheetName: 'summary',
        rows: [report.summary],
        columns: [
          'total_records',
          'miss_sats',
          'miss_tews',
          'miss_vitals',
          'miss_outcome',
        ],
      },
      {
        sheetName: 'by_ra',
        rows: report.by_ra,
        columns: [
          'extractor_id',
          'extractor_name',
          'total_records',
          'miss_sats',
          'miss_tews',
          'miss_vitals',
          'miss_outcome',
        ],
      },
      {
        sheetName: 'by_date',
        rows: report.by_date_range,
        columns: [
          'date',
          'total_records',
          'miss_sats',
          'miss_tews',
          'miss_vitals',
          'miss_outcome',
        ],
      },
    ]);
  }

  async getMissingDataReport(filters: ExportFilters) {
    const match = this.buildRecordMatch(filters);
    const summary = await this.recordModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total_records: { $sum: 1 },
          miss_sats: {
            $sum: { $cond: ['$data_quality.miss_sats', 1, 0] },
          },
          miss_tews: {
            $sum: { $cond: ['$data_quality.miss_tews', 1, 0] },
          },
          miss_vitals: {
            $sum: { $cond: ['$data_quality.miss_vitals', 1, 0] },
          },
          miss_outcome: {
            $sum: { $cond: ['$data_quality.miss_outcome', 1, 0] },
          },
        },
      },
    ]);

    const byRa = await this.recordModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$extractor_id',
          total_records: { $sum: 1 },
          miss_sats: { $sum: { $cond: ['$data_quality.miss_sats', 1, 0] } },
          miss_tews: { $sum: { $cond: ['$data_quality.miss_tews', 1, 0] } },
          miss_vitals: {
            $sum: { $cond: ['$data_quality.miss_vitals', 1, 0] },
          },
          miss_outcome: {
            $sum: { $cond: ['$data_quality.miss_outcome', 1, 0] },
          },
        },
      },
      { $sort: { total_records: -1 } },
    ]);
    const users = await this.userModel
      .find({ _id: { $in: byRa.map((row: any) => row._id).filter(Boolean) } })
      .lean();
    const userMap = new Map(
      users.map((entry: any) => [entry._id.toString(), entry.full_name]),
    );
    const byDateRange = await this.recordModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$eligibility.ed_date',
            },
          },
          total_records: { $sum: 1 },
          miss_sats: { $sum: { $cond: ['$data_quality.miss_sats', 1, 0] } },
          miss_tews: { $sum: { $cond: ['$data_quality.miss_tews', 1, 0] } },
          miss_vitals: {
            $sum: { $cond: ['$data_quality.miss_vitals', 1, 0] },
          },
          miss_outcome: {
            $sum: { $cond: ['$data_quality.miss_outcome', 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      summary: summary[0] ?? {
        total_records: 0,
        miss_sats: 0,
        miss_tews: 0,
        miss_vitals: 0,
        miss_outcome: 0,
      },
      by_ra: byRa.map((row: any) => ({
        extractor_id: row._id?.toString() ?? null,
        extractor_name: row._id
          ? (userMap.get(row._id.toString()) ?? null)
          : null,
        total_records: row.total_records,
        miss_sats: row.miss_sats,
        miss_tews: row.miss_tews,
        miss_vitals: row.miss_vitals,
        miss_outcome: row.miss_outcome,
      })),
      by_date_range: byDateRange.map((row: any) => ({
        date: row._id,
        total_records: row.total_records,
        miss_sats: row.miss_sats,
        miss_tews: row.miss_tews,
        miss_vitals: row.miss_vitals,
        miss_outcome: row.miss_outcome,
      })),
    };
  }

  async getExclusionLogXlsx(filters: ExportFilters) {
    const report = await this.getExclusionLog(filters);
    const exclusionEntries = report.exclusion_entries.map((entry: any) => ({
      id: entry._id?.toString?.() ?? null,
      research_record_id: entry.research_record_id?.toString?.() ?? null,
      exclusion_code: entry.exclusion_code ?? null,
      exclusion_reason: entry.exclusion_reason ?? null,
    }));

    return this.buildWorkbookBufferFromSheets([
      {
        sheetName: 'records',
        rows: report.records,
        columns: ['record_id', 'study_id', 'exclusion_code', 'exclusion_reason'],
      },
      {
        sheetName: 'entries',
        rows: exclusionEntries,
        columns: ['id', 'research_record_id', 'exclusion_code', 'exclusion_reason'],
      },
    ]);
  }

  async getExclusionLog(filters: ExportFilters) {
    const match = this.buildRecordMatch(filters);
    const excludedRecords = await this.recordModel
      .find({
        ...match,
        $or: [{ status: 'Excluded' }, { 'eligibility.eligible': false }],
      })
      .lean();
    const exclusions = await this.exclusionModel.find({}).lean();

    return {
      records: excludedRecords.map((record: any) => ({
        record_id: record._id.toString(),
        study_id: record.study_id,
        exclusion_code: record.eligibility?.exclusion_code ?? null,
        exclusion_reason: record.eligibility?.exclusion_reason ?? null,
      })),
      exclusion_entries: exclusions,
    };
  }

  async getProgressReportXlsx(filters: ExportFilters) {
    const report = await this.getProgressReport(filters);
    return this.buildWorkbookBufferFromSheets([
      {
        sheetName: 'summary',
        rows: [report.summary],
        columns: [
          'total_screened',
          'eligible',
          'excluded',
          'abstracted',
          'pending',
          'synced',
          'verified',
          'locked',
        ],
      },
      {
        sheetName: 'by_status',
        rows: report.by_status,
        columns: ['_id', 'count'],
      },
      {
        sheetName: 'by_mode',
        rows: report.by_mode,
        columns: ['_id', 'count'],
      },
      {
        sheetName: 'by_ra',
        rows: report.by_ra,
        columns: [
          'extractor_id',
          'extractor_name',
          'assigned',
          'completed',
          'remaining',
        ],
      },
    ]);
  }

  async getProgressReport(filters: ExportFilters) {
    const match = this.buildRecordMatch(filters);
    const summary = await this.recordModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total_screened: { $sum: 1 },
          eligible: { $sum: { $cond: ['$eligibility.eligible', 1, 0] } },
          excluded: { $sum: { $cond: ['$eligibility.eligible', 0, 1] } },
          abstracted: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    ['Complete', 'Synced', 'QC Required', 'Verified', 'Locked'],
                  ],
                },
                1,
                0,
              ],
            },
          },
          pending: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    [
                      'Draft',
                      'Clinical Data Complete - Outcome Pending',
                      'Returned for Correction',
                      'Pending Sync',
                      'Sync Failed',
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },
          synced: { $sum: { $cond: [{ $eq: ['$status', 'Synced'] }, 1, 0] } },
          verified: {
            $sum: { $cond: [{ $eq: ['$status', 'Verified'] }, 1, 0] },
          },
          locked: { $sum: { $cond: [{ $eq: ['$status', 'Locked'] }, 1, 0] } },
        },
      },
    ]);
    const byStatus = await this.recordModel.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const byMode = await this.recordModel.aggregate([
      { $match: match },
      { $group: { _id: '$mode', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const byRa = await this.recordModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$extractor_id',
          total_records: { $sum: 1 },
          completed_records: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    ['Complete', 'Synced', 'QC Required', 'Verified', 'Locked'],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);
    const users = await this.userModel
      .find({ _id: { $in: byRa.map((row: any) => row._id) } })
      .lean();
    const userMap = new Map(
      users.map((entry: any) => [entry._id.toString(), entry.full_name]),
    );

    return {
      summary: summary[0] ?? {
        total_screened: 0,
        eligible: 0,
        excluded: 0,
        abstracted: 0,
        pending: 0,
        synced: 0,
        verified: 0,
        locked: 0,
      },
      by_status: byStatus,
      by_mode: byMode,
      by_ra: byRa.map((row: any) => ({
        extractor_id: row._id?.toString() ?? null,
        extractor_name: row._id
          ? (userMap.get(row._id.toString()) ?? null)
          : null,
        assigned: row.total_records,
        completed: row.completed_records,
        remaining: row.total_records - row.completed_records,
      })),
    };
  }

  private buildRecordMatch(filters: ExportFilters) {
    const match: Record<string, unknown> = {};

    switch ((filters.status ?? 'all').toLowerCase()) {
      case 'completed':
        match.status = {
          $in: ['Complete', 'Synced', 'QC Required', 'Verified', 'Locked'],
        };
        break;
      case 'verified':
        match.status = { $in: ['Verified', 'Locked'] };
        break;
      case 'all':
        break;
      default:
        throw new BadRequestException('Unsupported export status filter');
    }

    if (filters.from || filters.to) {
      match['eligibility.ed_date'] = {};

      if (filters.from) {
        match['eligibility.ed_date'] = {
          ...(match['eligibility.ed_date'] as object),
          $gte: new Date(filters.from),
        };
      }

      if (filters.to) {
        match['eligibility.ed_date'] = {
          ...(match['eligibility.ed_date'] as object),
          $lte: new Date(filters.to),
        };
      }
    }

    if (filters.sats_cat) {
      match['sats.sats_cat'] = filters.sats_cat;
    }

    if (filters.ra) {
      match.extractor_id = new Types.ObjectId(filters.ra);
    }

    if (filters.mode) {
      match.mode = filters.mode.toUpperCase();
    }

    switch ((filters.eligible ?? 'eligible').toLowerCase()) {
      case 'eligible':
        match['eligibility.eligible'] = true;
        break;
      case 'excluded':
        match['eligibility.eligible'] = false;
        break;
      case 'all':
        break;
      default:
        throw new BadRequestException('Unsupported eligible filter');
    }

    return match;
  }

  private schemaToCodebookRows(schema: any, prefix: string) {
    if (!schema?.properties) {
      return [];
    }

    const rows: Array<Record<string, string>> = [];

    for (const [key, value] of Object.entries<any>(schema.properties)) {
      const variable = prefix ? `${prefix}.${key}` : key;

      if (value.properties) {
        rows.push(...this.schemaToCodebookRows(value, variable));
        continue;
      }

      rows.push({
        variable,
        label: variable.replaceAll('.', ' '),
        type: Array.isArray(value.bsonType)
          ? value.bsonType.join('|')
          : (value.bsonType ?? 'enum'),
        coding: Array.isArray(value.enum) ? value.enum.join(', ') : '',
        notes: Array.isArray(value.enum)
          ? 'Derived from MongoDB JSON Schema validation enums'
          : '',
      });
    }

    return rows;
  }

  private buildWorkbookBuffer(
    sheetName: string,
    rows: Array<Record<string, unknown>>,
    columns: string[],
  ) {
    return this.buildWorkbookBufferFromSheets([{ sheetName, rows, columns }]);
  }

  private buildWorkbookBufferFromSheets(
    sheets: Array<{
      sheetName: string;
      rows: Array<Record<string, unknown>>;
      columns: string[];
    }>,
  ) {
    const workbook = XLSX.utils.book_new();

    for (const sheet of sheets) {
      const worksheet = XLSX.utils.json_to_sheet(
        sheet.rows.map((row) => {
          const orderedRow: Record<string, unknown> = {};

          for (const column of sheet.columns) {
            orderedRow[column] = row[column] ?? null;
          }

          return orderedRow;
        }),
      );
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName);
    }

    return XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });
  }

  private escapeCsvValue(value: unknown) {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue =
      value instanceof Date
        ? value.toISOString()
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);

    return `"${stringValue.replaceAll('"', '""')}"`;
  }
}
