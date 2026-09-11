const IGNORED_FIELDS = new Set([
  '_id',
  'client_uuid',
  'status',
  'extractor_id',
  'linkage_id',
  'device_id',
  'app_version',
  'data_dictionary_version',
  'version',
  'created_at',
  'updated_at',
  'duplicate_flags',
]);

export type ComparisonRow = {
  field: string;
  ra_value: unknown;
  qc_value: unknown;
  matches: boolean;
  value_type: 'categorical' | 'numeric' | 'other';
};

export function buildQcComparison(
  raRecord: Record<string, unknown>,
  qcRecord: Record<string, unknown>,
) {
  const flattenedRa = flattenRecord(raRecord);
  const flattenedQc = flattenRecord(qcRecord);
  const allFields = new Set([...flattenedRa.keys(), ...flattenedQc.keys()]);
  const comparisons: ComparisonRow[] = [];

  for (const field of allFields) {
    const raValue = flattenedRa.get(field);
    const qcValue = flattenedQc.get(field);

    comparisons.push({
      field,
      ra_value: raValue,
      qc_value: qcValue,
      matches:
        JSON.stringify(raValue ?? null) === JSON.stringify(qcValue ?? null),
      value_type:
        typeof raValue === 'number' || typeof qcValue === 'number'
          ? 'numeric'
          : typeof raValue === 'string' || typeof qcValue === 'string'
            ? 'categorical'
            : 'other',
    });
  }

  const comparableRows = comparisons.filter(
    (row) => row.value_type !== 'other',
  );
  const matchedRows = comparableRows.filter((row) => row.matches);

  return {
    agreement_pct:
      comparableRows.length === 0
        ? 100
        : Number(
            ((matchedRows.length / comparableRows.length) * 100).toFixed(2),
          ),
    discrepancies: comparisons
      .filter((row) => !row.matches)
      .map((row) => row.field),
    comparisons,
  };
}

function flattenRecord(
  value: Record<string, unknown>,
  prefix = '',
  output = new Map<string, unknown>(),
) {
  for (const [key, entry] of Object.entries(value)) {
    if (IGNORED_FIELDS.has(key)) {
      continue;
    }

    const path = prefix ? `${prefix}.${key}` : key;

    if (isPlainObject(entry)) {
      flattenRecord(entry, path, output);
      continue;
    }

    output.set(path, entry ?? null);
  }

  return output;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
