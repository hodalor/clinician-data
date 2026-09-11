import { Schema } from 'mongoose';

export const RefreshTokenModelName = 'RefreshToken';

export const RefreshTokenSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    jti: { type: String, required: true, trim: true },
    token_hash: { type: String, required: true },
    device_id: { type: String, default: null, trim: true },
    revoked_at: { type: Date, default: null },
    expires_at: { type: Date, required: true },
    created_at: { type: Date, required: true },
  },
  {
    collection: 'refresh_tokens',
    versionKey: false,
  },
);

RefreshTokenSchema.index(
  { jti: 1 },
  { unique: true, name: 'uq_refresh_tokens_jti' },
);
RefreshTokenSchema.index(
  { user_id: 1, device_id: 1 },
  { name: 'idx_refresh_tokens_user_id_device_id' },
);
