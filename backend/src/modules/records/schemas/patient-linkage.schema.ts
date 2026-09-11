import { Schema } from 'mongoose';

export const PatientLinkageModelName = 'PatientLinkage';

// This collection is intended for restricted access only.
export const PatientLinkageSchema = new Schema(
  {
    hospital_record_number_encrypted: {
      type: String,
      required: true,
      trim: true,
    },
    hashed_number: { type: String, required: true, trim: true },
    study_id: { type: String, required: true, trim: true },
  },
  {
    collection: 'patient_linkage',
    versionKey: false,
  },
);
