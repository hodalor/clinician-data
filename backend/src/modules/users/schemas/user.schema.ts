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
  },
  {
    collection: 'users',
    versionKey: false,
  },
);
