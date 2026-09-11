import { requestJson } from './http';
import type { SuperbinResponse } from './types';

export type SuperbinCollection = 'users' | 'assignments' | 'devices' | 'records';

export function listSuperbinItems(collection: SuperbinCollection) {
  return requestJson<SuperbinResponse>(`/superbin/${collection}`, {
    withAuth: true,
  });
}

export function restoreSuperbinItem(
  collection: SuperbinCollection,
  id: string,
) {
  return requestJson(`/superbin/${collection}/${id}/restore`, {
    method: 'POST',
    withAuth: true,
  });
}

export function permanentlyDeleteSuperbinItem(
  collection: SuperbinCollection,
  id: string,
) {
  return requestJson(`/superbin/${collection}/${id}`, {
    method: 'DELETE',
    withAuth: true,
  });
}
