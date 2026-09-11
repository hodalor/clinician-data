export type UserRole = 'RA' | 'QC' | 'PI' | 'ADMIN' | 'SUPERADMIN';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  access_token_expires_in: number;
  refresh_token_expires_in: number;
}

export interface AuthSession extends AuthTokens {
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RefreshPayload {
  refresh_token: string;
}

export interface LogoutPayload {
  refresh_token: string;
}

export interface ApiErrorPayload {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export interface AssignmentProgress {
  total_records: number;
  completed_records: number;
}

export interface AssignmentSummary {
  id: string;
  ra_id: string;
  ra_name: string;
  pi_id: string;
  pi_name: string;
  date_range: {
    from: string;
    to: string;
  };
  register_pages: string[];
  file_ranges: string[];
  status: string;
  progress: AssignmentProgress;
  created_at: string;
  deleted_at?: string | null;
  delete_reason?: string | null;
}

export interface AssignmentDetailResponse {
  assignment: AssignmentSummary;
  records: Array<{
    id: string;
    study_id: string;
    status: string;
    updated_at: string | null;
  }>;
}

export interface AssignmentOptionUser {
  id: string;
  full_name: string;
  email: string;
}

export interface AssignmentOptionsResponse {
  ras: AssignmentOptionUser[];
  pis: AssignmentOptionUser[];
}

export interface UpsertAssignmentPayload {
  pi_id?: string;
  ra_id: string;
  date_range: {
    from: string;
    to: string;
  };
  register_pages: string[];
  file_ranges: string[];
  status: string;
}

export interface RecordListItem {
  _id: string;
  study_id: string;
  status: string;
  extractor_id?: string;
  mode?: string;
  version?: number;
  updated_at?: string;
  created_at?: string;
  deleted_at?: string | null;
  delete_reason?: string | null;
  eligibility?: Record<string, unknown>;
  patient?: Record<string, unknown>;
  sats?: Record<string, unknown>;
  physiology?: Record<string, unknown>;
  presentation?: Record<string, unknown>;
  process?: Record<string, unknown>;
  outcome?: Record<string, unknown> | null;
  data_quality?: {
    reviewer_id?: string;
    qc_comment?: string;
    qc_required?: boolean;
    [key: string]: unknown;
  };
  duplicate_flags?: Array<{
    matched_record_id?: string;
    basis: string[];
    resolved: boolean;
  }>;
  [key: string]: unknown;
}

export interface RecordListResponse {
  data: RecordListItem[];
}

export interface QcComparisonRow {
  field: string;
  ra_value: unknown;
  qc_value: unknown;
  matches: boolean;
  value_type: 'categorical' | 'numeric' | 'other';
}

export interface QcComparisonResponse {
  agreement_pct: number;
  discrepancies: string[];
  comparisons: QcComparisonRow[];
}

export interface DuplicateQueueRecord {
  record_id: string;
  study_id: string;
  duplicate_flags: Array<{
    matched_record_id?: string;
    basis: string[];
    resolved: boolean;
  }>;
}

export interface DuplicateQueueResponse {
  data: DuplicateQueueRecord[];
}

export interface AuditHistoryEntry {
  id: string;
  field: string;
  previous_value: unknown;
  new_value: unknown;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
  reason: string;
  app_version: string;
}

export interface AuditHistoryResponse {
  data: AuditHistoryEntry[];
}

export interface GlobalAuditEntry extends AuditHistoryEntry {
  research_record_id: string;
  study_id: string | null;
}

export interface GlobalAuditResponse {
  data: GlobalAuditEntry[];
}

export interface ProgressReportResponse {
  summary: {
    total_screened: number;
    eligible: number;
    excluded: number;
    abstracted: number;
    pending: number;
    synced: number;
    verified: number;
    locked: number;
  };
  by_status: Array<{ _id: string; count: number }>;
  by_mode: Array<{ _id: string; count: number }>;
  by_ra: Array<{
    extractor_id: string | null;
    extractor_name: string | null;
    assigned: number;
    completed: number;
    remaining: number;
  }>;
}

export interface MissingnessReportResponse {
  summary: {
    total_records: number;
    miss_sats: number;
    miss_tews: number;
    miss_vitals: number;
    miss_outcome: number;
  };
  by_ra: Array<{
    extractor_id: string | null;
    extractor_name: string | null;
    total_records: number;
    miss_sats: number;
    miss_tews: number;
    miss_vitals: number;
    miss_outcome: number;
  }>;
  by_date_range: Array<{
    date: string;
    total_records: number;
    miss_sats: number;
    miss_tews: number;
    miss_vitals: number;
    miss_outcome: number;
  }>;
}

export interface UserSummary {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  status: 'active' | 'disabled';
  created_at: string;
  deleted_at?: string | null;
  delete_reason?: string | null;
}

export interface UserListResponse {
  data: UserSummary[];
}

export interface UpsertUserPayload {
  email: string;
  password?: string;
  role: UserRole;
  full_name: string;
  status?: 'active' | 'disabled';
}

export interface DeviceSummary {
  id: string;
  device_id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  authorised: boolean;
  deactivated_at: string | null;
  last_seen_at: string | null;
  deleted_at?: string | null;
  delete_reason?: string | null;
}

export interface DeletePayload {
  reason: string;
}

export interface SuperbinItem {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  detail: string;
  actor: string | null;
  deleted_at: string | null;
  delete_reason: string | null;
}

export interface SuperbinResponse {
  data: SuperbinItem[];
}

export interface DeviceListResponse {
  data: DeviceSummary[];
}

export interface DeviceRequestSummary {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  requested_device_id: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface DeviceRequestListResponse {
  data: DeviceRequestSummary[];
}

export interface StudyConfigurationValue {
  code: string;
  label: string;
}

export interface InitialDestinationCodesResponse {
  key: string;
  values: StudyConfigurationValue[];
  updated_by: string | null;
  updated_by_name: string | null;
  updated_at: string | null;
  pending_pi_approval: boolean;
}
