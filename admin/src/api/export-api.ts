import { requestBlob, requestJson } from './http';
import type { MissingnessReportResponse, ProgressReportResponse } from './types';

type ExportFilters = {
  status?: string;
  from?: string;
  to?: string;
  sats_cat?: string;
  ra?: string;
  mode?: string;
  eligible?: string;
};

function buildQuery(filters: ExportFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function getProgressReport(filters: ExportFilters) {
  return requestJson<ProgressReportResponse>(
    `/export/progress-report${buildQuery(filters)}`,
    { withAuth: true },
  );
}

export function getMissingnessReport(filters: ExportFilters) {
  return requestJson<MissingnessReportResponse>(
    `/export/missing-data-report${buildQuery(filters)}`,
    { withAuth: true },
  );
}

export async function downloadExport(
  endpoint:
    | 'master.csv'
    | 'master.xlsx'
    | 'codebook.xlsx'
    | 'qc-report.xlsx'
    | 'missing-data-report.xlsx'
    | 'exclusion-log.xlsx'
    | 'progress-report.xlsx',
  filters: ExportFilters,
) {
  const suffix = buildQuery(filters);
  return requestBlob(`/export/${endpoint}${suffix}`, { withAuth: true });
}
