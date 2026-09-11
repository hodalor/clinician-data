import { Schema } from 'mongoose';

export const QcReviewModelName = 'QcReview';

export const QcReviewSchema = new Schema(
  {
    research_record_id: {
      type: Schema.Types.ObjectId,
      ref: 'ResearchRecord',
      required: true,
    },
    qc_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    re_abstracted_values: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    discrepancies: { type: [String], required: true, default: [] },
    agreement_pct: { type: Number, required: true },
    status: { type: String, required: true, trim: true },
  },
  {
    collection: 'qc_reviews',
    versionKey: false,
    minimize: false,
  },
);

QcReviewSchema.index(
  { research_record_id: 1 },
  { name: 'idx_qc_reviews_research_record_id' },
);
