import { Schema } from 'mongoose';
import {
  OUTCOME24_CODES,
  OUTCOME_SOURCE_CODES,
} from '../../../common/database/schema.constants.js';

export const OutcomeModelName = 'Outcome';

export const OutcomeSchema = new Schema(
  {
    research_record_id: {
      type: Schema.Types.ObjectId,
      ref: 'ResearchRecord',
      required: true,
    },
    outcome24: { type: String, enum: OUTCOME24_CODES, required: true },
    outcome_datetime: { type: Date },
    outcome_source: {
      type: String,
      enum: OUTCOME_SOURCE_CODES,
      required: true,
    },
    verified: { type: Boolean, required: true },
    verified_by: { type: Schema.Types.ObjectId, ref: 'User' },
    verified_at: { type: Date, default: null },
  },
  {
    collection: 'outcomes',
    versionKey: false,
  },
);

OutcomeSchema.index(
  { research_record_id: 1 },
  { name: 'idx_outcomes_research_record_id' },
);
