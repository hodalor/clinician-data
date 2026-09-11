import { requestJson } from './http';
import type {
  DuplicateQueueResponse,
  QcComparisonResponse,
} from './types';

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
