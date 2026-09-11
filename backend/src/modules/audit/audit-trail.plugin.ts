import { Schema, Types } from 'mongoose';
import { getAuditContext } from '../../common/audit/audit-context.js';

const POST_COMPLETE_STATUSES = new Set([
  'Complete',
  'Pending Sync',
  'Needs Review',
  'Sync Failed',
  'Synced',
  'QC Required',
  'Returned for Correction',
  'Verified',
  'Locked',
]);

const DIFF_EXCLUDED_FIELDS = new Set(['updated_at']);

type AuditEntry = {
  research_record_id: Types.ObjectId;
  field: string;
  previous_value: unknown;
  new_value: unknown;
  changed_by: Types.ObjectId;
  changed_at: Date;
  reason: string;
  app_version: string;
};

export function auditTrailPlugin(schema: Schema) {
  schema.pre('save', async function auditTrailPreSave(this: any) {
    if (this.isNew) {
      return;
    }

    const original = await (this.constructor as any)
      .findById(this._id)
      .lean()
      .exec();
    this.$locals.originalDocument = original;
  });

  schema.post('save', async function auditTrailPostSave(document: any) {
    const original = document.$locals?.originalDocument as
      Record<string, unknown> | undefined;

    if (!original || !shouldAudit(original.status)) {
      return;
    }

    const auditContext = getAuditContext();

    if (
      !auditContext?.changedBy ||
      !Types.ObjectId.isValid(auditContext.changedBy)
    ) {
      return;
    }

    const diffs = buildDiffEntries(original, document.toObject());

    if (diffs.length === 0) {
      return;
    }

    const changedAt = new Date();
    const entries: AuditEntry[] = diffs.map((diff) => ({
      research_record_id: document._id as Types.ObjectId,
      field: diff.field,
      previous_value: normalizeAuditValue(diff.previousValue),
      new_value: normalizeAuditValue(diff.newValue),
      changed_by: new Types.ObjectId(auditContext.changedBy as string),
      changed_at: changedAt,
      reason: auditContext.reason ?? 'Automated change',
      app_version:
        auditContext.appVersion ??
        (document.app_version as string | undefined) ??
        (original.app_version as string | undefined) ??
        'unknown',
    }));

    await document.db.collection('audit_logs').insertMany(entries);
  });
}

function shouldAudit(status: unknown) {
  return typeof status === 'string' && POST_COMPLETE_STATUSES.has(status);
}

function buildDiffEntries(
  previousDocument: Record<string, unknown>,
  currentDocument: Record<string, unknown>,
  prefix = '',
) {
  const keys = new Set([
    ...Object.keys(previousDocument ?? {}),
    ...Object.keys(currentDocument ?? {}),
  ]);
  const diffs: Array<{
    field: string;
    previousValue: unknown;
    newValue: unknown;
  }> = [];

  for (const key of keys) {
    if (DIFF_EXCLUDED_FIELDS.has(key)) {
      continue;
    }

    const previousValue = previousDocument?.[key];
    const newValue = currentDocument?.[key];
    const fieldPath = prefix ? `${prefix}.${key}` : key;

    if (isPlainObject(previousValue) && isPlainObject(newValue)) {
      diffs.push(...buildDiffEntries(previousValue, newValue, fieldPath));
      continue;
    }

    if (areValuesEqual(previousValue, newValue)) {
      continue;
    }

    diffs.push({
      field: fieldPath,
      previousValue,
      newValue,
    });
  }

  return diffs;
}

function areValuesEqual(left: unknown, right: unknown) {
  return (
    JSON.stringify(normalizeAuditValue(left)) ===
    JSON.stringify(normalizeAuditValue(right))
  );
}

function normalizeAuditValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value;
  }

  if (value instanceof Types.ObjectId) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeAuditValue(entry));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        normalizeAuditValue(entry),
      ]),
    );
  }

  return value ?? null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof Types.ObjectId)
  );
}
