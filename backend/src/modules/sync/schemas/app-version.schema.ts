import { Schema } from 'mongoose';

export const AppVersionModelName = 'AppVersion';

export const AppVersionSchema = new Schema(
  {
    version: { type: String, required: true, trim: true },
    data_dictionary_version: { type: String, required: true, trim: true },
    released_at: { type: Date, required: true },
    notes: { type: String, trim: true },
  },
  {
    collection: 'app_versions',
    versionKey: false,
  },
);
