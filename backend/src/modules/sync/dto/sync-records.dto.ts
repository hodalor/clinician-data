export interface SyncPatientLinkageDto {
  hospital_record_number_encrypted?: string;
  hashed_number: string;
  study_id: string;
}

export interface SyncOutcomeDto {
  outcome24: string;
  outcome_datetime: string;
  outcome_source: string;
  verified?: boolean;
}

export interface SyncRecordItemDto {
  client_uuid: string;
  version: number;
  record: Record<string, unknown>;
  patient_linkage?: SyncPatientLinkageDto;
  outcome?: SyncOutcomeDto;
}

export interface SyncRecordsDto {
  records: SyncRecordItemDto[];
}
