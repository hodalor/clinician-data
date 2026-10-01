import {
  assignRoundRobin,
  selectStratifiedSample,
} from './qc-assignment.util.js';

describe('selectStratifiedSample', () => {
  it('samples the same percentage from each extractor', () => {
    const records = [
      ...buildRecords('ra-a', 60),
      ...buildRecords('ra-b', 40),
    ];

    const selected = selectStratifiedSample(records, 10, () => 0.1);

    expect(selected).toHaveLength(10);
    expect(countByExtractor(selected, 'ra-a')).toBe(6);
    expect(countByExtractor(selected, 'ra-b')).toBe(4);
  });

  it('spreads a small sample across extractors when a record is available', () => {
    const records = [
      ...buildRecords('ra-a', 10),
      ...buildRecords('ra-b', 10),
      ...buildRecords('ra-c', 10),
    ];

    const selected = selectStratifiedSample(records, 10, () => 0.1);

    expect(selected).toHaveLength(3);
    expect(countByExtractor(selected, 'ra-a')).toBe(1);
    expect(countByExtractor(selected, 'ra-b')).toBe(1);
    expect(countByExtractor(selected, 'ra-c')).toBe(1);
  });

  it('returns nothing when the percentage rounds down to zero records', () => {
    const selected = selectStratifiedSample(buildRecords('ra-a', 4), 10);

    expect(selected).toEqual([]);
  });

  it('returns every record at 100 percent', () => {
    const records = buildRecords('ra-a', 3);
    const selected = selectStratifiedSample(records, 100, () => 0);

    expect(selected).toHaveLength(3);
  });
});

describe('assignRoundRobin', () => {
  it('rotates records across reviewers', () => {
    const records = ['r1', 'r2', 'r3', 'r4', 'r5'];
    const assignments = assignRoundRobin(records, ['qc-a', 'qc-b']);

    expect(assignments.map((item) => item.qcUserId)).toEqual([
      'qc-a',
      'qc-b',
      'qc-a',
      'qc-b',
      'qc-a',
    ]);
  });
});

function buildRecords(extractorId: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${extractorId}-${index}`,
    extractorId,
  }));
}

function countByExtractor(
  records: Array<{ extractorId: string }>,
  extractorId: string,
) {
  return records.filter((record) => record.extractorId === extractorId).length;
}
