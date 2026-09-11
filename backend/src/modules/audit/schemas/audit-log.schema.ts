import { Schema } from 'mongoose';

export const AuditLogModelName = 'AuditLog';

// This schema is append-only by convention. Route handlers should never update or delete it.
export const AuditLogSchema = new Schema(
  {
    research_record_id: {
      type: Schema.Types.ObjectId,
      ref: 'ResearchRecord',
      required: true,
    },
    field: { type: String, required: true, trim: true },
    previous_value: { type: Schema.Types.Mixed, required: true },
    new_value: { type: Schema.Types.Mixed, required: true },
    changed_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changed_at: { type: Date, required: true },
    reason: { type: String, required: true, trim: true },
    app_version: { type: String, required: true, trim: true },
  },
  {
    collection: 'audit_logs',
    versionKey: false,
  },
);

AuditLogSchema.index(
  { research_record_id: 1 },
  { name: 'idx_audit_logs_research_record_id' },
);
