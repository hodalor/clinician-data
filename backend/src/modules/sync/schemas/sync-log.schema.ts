import { Schema } from 'mongoose';

export const SyncLogModelName = 'SyncLog';

export const SyncLogSchema = new Schema(
  {
    device_id: { type: String, required: true, trim: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    record_id: {
      type: Schema.Types.ObjectId,
      ref: 'ResearchRecord',
      required: true,
    },
    timestamp: { type: Date, required: true },
    status: { type: String, required: true, trim: true },
    error_detail: { type: String, trim: true },
  },
  {
    collection: 'sync_logs',
    versionKey: false,
  },
);
