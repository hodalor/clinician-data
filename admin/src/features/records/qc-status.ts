export const qcStatusFilterOptions = [
  { value: 'not_assigned', label: 'Not yet assigned' },
  { value: 'qc_required', label: 'QC Required' },
  { value: 'verified', label: 'Verified' },
];

export function qcAssignmentStatus(record: {
  status?: string;
  data_quality?: { qc_required?: boolean };
}) {
  if (record.status === 'Verified' || record.status === 'Locked') {
    return 'Verified';
  }

  if (
    record.status === 'QC Required' ||
    record.status === 'Returned for Correction' ||
    record.data_quality?.qc_required === true
  ) {
    return 'QC Required';
  }

  if (record.status === 'Complete' || record.status === 'Synced') {
    return 'Not yet assigned';
  }

  return '—';
}

export function formatQcAssignmentSummary(
  recordCount: number,
  reviewerCount: number,
) {
  const recordsLabel = recordCount === 1 ? 'record' : 'records';
  const reviewersLabel = reviewerCount === 1 ? 'reviewer' : 'reviewers';
  return `${recordCount} ${recordsLabel} will be assigned across ${reviewerCount} ${reviewersLabel}`;
}
