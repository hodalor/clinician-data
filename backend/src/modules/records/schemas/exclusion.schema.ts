import { Schema } from 'mongoose';
import { EXCLUSION_CODES } from '../../../common/database/schema.constants.js';

export const ExclusionModelName = 'Exclusion';

export const ExclusionSchema = new Schema(
  {
    research_record_id: {
      type: Schema.Types.ObjectId,
      ref: 'ResearchRecord',
      required: true,
    },
    exclusion_code: { type: String, enum: EXCLUSION_CODES, required: true },
    exclusion_reason: { type: String, trim: true },
  },
  {
    collection: 'exclusions',
    versionKey: false,
  },
);
