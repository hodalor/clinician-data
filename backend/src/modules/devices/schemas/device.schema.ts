import { Schema } from 'mongoose';

export const DeviceModelName = 'Device';

export const DeviceSchema = new Schema(
  {
    device_id: { type: String, required: true, trim: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorised: { type: Boolean, required: true },
    deactivated_at: { type: Date, default: null },
    last_seen_at: { type: Date, default: null },
  },
  {
    collection: 'devices',
    versionKey: false,
  },
);

DeviceSchema.index(
  { user_id: 1, device_id: 1 },
  { unique: true, name: 'uq_devices_user_id_device_id' },
);
