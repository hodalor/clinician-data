export interface QcAssignDto {
  qc_user_id: string;
}

export interface QcReabstractDto {
  re_abstracted_values: Record<string, unknown>;
}

export interface QcResolveDto {
  action: 'approve' | 'correct' | 'return-to-RA' | 'verify-and-lock';
  corrected_values?: Record<string, unknown>;
  reason?: string;
  qc_comment?: string;
}

export interface QcDuplicateResolveDto {
  matched_record_id: string;
}
