import { requestJson } from './http';
import type {
  AssignmentDetailResponse,
  AssignmentOptionsResponse,
  AssignmentSummary,
  DeletePayload,
  UpsertAssignmentPayload,
} from './types';

export function listAssignments() {
  return requestJson<{ data: AssignmentSummary[] }>('/assignments', {
    withAuth: true,
  });
}

export function getAssignmentOptions() {
  return requestJson<AssignmentOptionsResponse>('/assignments/options', {
    withAuth: true,
  });
}

export function getAssignmentDetail(id: string) {
  return requestJson<AssignmentDetailResponse>(`/assignments/${id}`, {
    withAuth: true,
  });
}

export function createAssignment(payload: UpsertAssignmentPayload) {
  return requestJson<{ assignment: AssignmentSummary }>('/assignments', {
    method: 'POST',
    body: payload,
    withAuth: true,
  });
}

export function updateAssignment(id: string, payload: UpsertAssignmentPayload) {
  return requestJson<{ assignment: AssignmentSummary }>(`/assignments/${id}`, {
    method: 'PUT',
    body: payload,
    withAuth: true,
  });
}

export function deleteAssignment(id: string, payload: DeletePayload) {
  return requestJson(`/assignments/${id}/delete`, {
    method: 'POST',
    body: payload,
    withAuth: true,
  });
}
