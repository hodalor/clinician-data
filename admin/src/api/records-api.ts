import { requestJson } from './http';
import type {
  AuditHistoryResponse,
  DeletePayload,
  RecordListItem,
  RecordListResponse,
  UpsertOutcomePayload,
} from './types';

export function listRecords(params?: Record<string, string | undefined>) {
  const queryString = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value) {
      queryString.set(key, value);
    }
  });

  const suffix = queryString.toString() ? `?${queryString.toString()}` : '';
  return requestJson<RecordListResponse>(`/records${suffix}`, {
    withAuth: true,
  });
}

export function getRecord(id: string) {
  return requestJson<{ record: RecordListItem }>(`/records/${id}`, {
    withAuth: true,
  });
}

export function getRecordAuditHistory(id: string) {
  return requestJson<AuditHistoryResponse>(`/records/${id}/audit`, {
    withAuth: true,
  });
}

export function updateRecord(id: string, payload: Record<string, unknown>) {
  return requestJson<{ record: RecordListItem; warnings: string[] }>(`/records/${id}`, {
    method: 'PUT',
    body: payload,
    withAuth: true,
  });
}

export function upsertRecordOutcome(id: string, payload: UpsertOutcomePayload) {
  return requestJson<{
    record: RecordListItem;
    outcome: UpsertOutcomePayload;
  }>(`/records/${id}/outcome`, {
    method: 'POST',
    body: payload,
    withAuth: true,
  });
}

export function reopenRecord(id: string, reason: string) {
  return requestJson<{ record: RecordListItem }>(`/records/${id}/reopen`, {
    method: 'POST',
    body: { reason },
    withAuth: true,
  });
}

export function deleteRecord(id: string, payload: DeletePayload) {
  return requestJson(`/records/${id}/delete`, {
    method: 'POST',
    body: payload,
    withAuth: true,
  });
}
