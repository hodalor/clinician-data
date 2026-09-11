import { Schema } from 'mongoose';

export const AssignmentModelName = 'Assignment';

const DateRangeSchema = new Schema(
  {
    from: { type: Date, required: true },
    to: { type: Date, required: true },
  },
  {
    _id: false,
    versionKey: false,
  },
);

export const AssignmentSchema = new Schema(
  {
    pi_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ra_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date_range: { type: DateRangeSchema, required: true },
    register_pages: [{ type: String }],
    file_ranges: [{ type: String }],
    status: { type: String, required: true, trim: true },
    created_at: { type: Date, required: true },
  },
  {
    collection: 'assignments',
    versionKey: false,
  },
);
