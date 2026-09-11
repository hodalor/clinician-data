import { Schema } from 'mongoose';

export const StudyConfigurationModelName = 'StudyConfiguration';

const StudyConfigurationValueSchema = new Schema(
  {
    code: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
  },
  { _id: false, versionKey: false },
);

export const StudyConfigurationSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    values: {
      type: [StudyConfigurationValueSchema],
      default: [],
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updated_at: {
      type: Date,
      required: true,
    },
  },
  {
    collection: 'study_configurations',
    versionKey: false,
  },
);

StudyConfigurationSchema.index(
  { key: 1 },
  { unique: true, name: 'uq_study_configurations_key' },
);
