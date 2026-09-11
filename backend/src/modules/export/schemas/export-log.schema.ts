import { Schema } from 'mongoose';

export const ExportLogModelName = 'ExportLog';

export const ExportLogSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true, trim: true },
    endpoint: { type: String, required: true, trim: true },
    filters: { type: Schema.Types.Mixed, required: true },
    created_at: { type: Date, required: true },
  },
  {
    collection: 'export_logs',
    versionKey: false,
  },
);

ExportLogSchema.index(
  { user_id: 1, created_at: -1 },
  { name: 'idx_export_logs_user_created_at' },
);
