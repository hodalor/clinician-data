import { AsyncLocalStorage } from 'async_hooks';

export type AuditContext = {
  changedBy?: string | null;
  reason?: string | null;
  appVersion?: string | null;
};

const auditContextStorage = new AsyncLocalStorage<AuditContext>();

export function runWithAuditContext<T>(
  context: AuditContext,
  callback: () => T,
) {
  return auditContextStorage.run(context, callback);
}

export function getAuditContext() {
  return auditContextStorage.getStore();
}
