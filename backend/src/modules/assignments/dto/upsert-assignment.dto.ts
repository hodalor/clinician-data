export interface UpsertAssignmentDto {
  pi_id?: string;
  ra_id: string;
  date_range: {
    from: string;
    to: string;
  };
  register_pages?: string[];
  file_ranges?: string[];
  status: string;
}
