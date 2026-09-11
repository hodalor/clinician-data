import { Schema } from 'mongoose';
import {
  USER_ROLES,
  USER_STATUSES,
} from '../../../common/database/schema.constants.js';

export const UserModelName = 'User';

export const UserSchema = new Schema(
  {
    email: { type: String, required: true, trim: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true },
    full_name: { type: String, required: true, trim: true },
    status: { type: String, enum: USER_STATUSES, required: true },
    created_at: { type: Date, required: true },
    deleted_at: { type: Date, default: null },
    deleted_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    delete_reason: { type: String, trim: true, default: null },
  },
  {
    collection: 'users',
    versionKey: false,
  },
);
