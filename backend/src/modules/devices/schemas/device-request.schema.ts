import { Schema } from 'mongoose';

export const DeviceRequestModelName = 'DeviceRequest';

export const DeviceRequestSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requested_device_id: { type: String, required: true, trim: true },
    requested_at: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected'],
    },
  },
  {
    collection: 'device_requests',
    versionKey: false,
  },
);

DeviceRequestSchema.index(
  { user_id: 1, requested_device_id: 1 },
  { unique: true, name: 'uq_device_requests_user_id_requested_device_id' },
);
DeviceRequestSchema.index(
  { status: 1, requested_at: -1 },
  { name: 'idx_device_requests_status_requested_at' },
);
