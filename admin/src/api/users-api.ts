import { requestJson } from './http';
import type { UpsertUserPayload, UserListResponse, UserSummary } from './types';

export function listUsers() {
  return requestJson<UserListResponse>('/users', { withAuth: true });
}

export function createUser(payload: UpsertUserPayload) {
  return requestJson<{ user: UserSummary }>('/users', {
    method: 'POST',
    body: payload,
    withAuth: true,
  });
}

export function updateUser(id: string, payload: UpsertUserPayload) {
  return requestJson<{ user: UserSummary }>(`/users/${id}`, {
    method: 'PUT',
    body: payload,
    withAuth: true,
  });
}
