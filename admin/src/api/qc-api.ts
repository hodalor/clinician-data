import { requestJson } from './http';
import type {
  DuplicateQueueResponse,
  QcAssignResponse,
  QcAssignmentItem,
  QcComparisonResponse,
  QcReviewSession,
} from './types';

export function getQcReviewSession(recordId: string) {
  return requestJson<QcReviewSession>(`/qc/${recordId}/session`, {
    withAuth: true,
  });
}

export function submitQcReabstraction(
  recordId: string,
  reAbstractedValues: Record<string, unknown>,
) {
  return requestJson(`/qc/${recordId}/reabstract`, {
    method: 'POST',
    body: {
      re_abstracted_values: reAbstractedValues,
    },
    withAuth: true,
  });
}

export function assignRecordToQc(recordId: string, qcUserId: string) {
  return requestJson<QcAssignResponse>('/qc/assign', {
    method: 'POST',
    body: {
      record_id: recordId,
      qc_user_id: qcUserId,
    },
    withAuth: true,
  });
}

export function previewQcAutoAssign(payload: {
  percentage: number;
  production_only: boolean;
}) {
  return requestJson<QcAssignResponse>('/qc/assign', {
    method: 'POST',
    body: {
      ...payload,
      dry_run: true,
    },
    withAuth: true,
  });
}

export function commitQcAssignments(assignments: QcAssignmentItem[]) {
  return requestJson<QcAssignResponse>('/qc/assign', {
    method: 'POST',
    body: { assignments },
    withAuth: true,
  });
}

export function getQcComparison(recordId: string) {
  return requestJson<QcComparisonResponse>(`/qc/${recordId}/compare`, {
    withAuth: true,
  });
}

export function resolveQcRecord(
  recordId: string,
  payload: {
    action: 'approve' | 'correct' | 'return-to-RA' | 'verify-and-lock';
    corrected_values?: Record<string, unknown>;
    reason?: string;
    qc_comment?: string;
  },
) {
  return requestJson(`/qc/${recordId}/resolve`, {
    method: 'POST',
    body: payload,
    withAuth: true,
  });
}

export function listDuplicates() {
  return requestJson<DuplicateQueueResponse>('/qc/duplicates', {
    withAuth: true,
  });
}

export function resolveDuplicate(recordId: string, matchedRecordId: string) {
  return requestJson(`/qc/duplicates/${recordId}/resolve`, {
    method: 'POST',
    body: {
      matched_record_id: matchedRecordId,
    },
    withAuth: true,
  });
}
