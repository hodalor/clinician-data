import { requestJson } from './http';
import type { GlobalAuditResponse } from './types';

export function listAuditLogs(params?: Record<string, string | undefined>) {
  const queryString = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value) {
      queryString.set(key, value);
    }
  });

  const suffix = queryString.toString() ? `?${queryString.toString()}` : '';
  return requestJson<GlobalAuditResponse>(`/audit${suffix}`, {
    withAuth: true,
  });
}
