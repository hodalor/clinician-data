export interface StratifiedRecord {
  extractorId: string;
}

export interface RoundRobinAssignment<T> {
  record: T;
  qcUserId: string;
}

/**
 * Takes about `percentage` of the records, split across extractors in proportion
 * to how many eligible records each extractor has. Leftover slots from rounding
 * go to the extractors with the largest fractional share.
 */
export function selectStratifiedSample<T extends StratifiedRecord>(
  records: T[],
  percentage: number,
  random: () => number = Math.random,
): T[] {
  if (records.length === 0 || percentage <= 0) {
    return [];
  }

  const targetTotal = Math.round((records.length * percentage) / 100);

  if (targetTotal <= 0) {
    return [];
  }

  if (targetTotal >= records.length) {
    return shuffle(records, random);
  }

  const groups = new Map<string, T[]>();

  for (const record of records) {
    const extractorId = record.extractorId || 'unassigned';
    const group = groups.get(extractorId) ?? [];
    group.push(record);
    groups.set(extractorId, group);
  }

  const entries = [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([extractorId, group]) => {
      const exact = (group.length / records.length) * targetTotal;
      return {
        extractorId,
        group,
        take: Math.floor(exact),
        fraction: exact - Math.floor(exact),
      };
    });

  let assigned = entries.reduce((sum, entry) => sum + entry.take, 0);
  const byRemainder = [...entries].sort((left, right) => {
    if (right.fraction !== left.fraction) {
      return right.fraction - left.fraction;
    }

    return left.extractorId.localeCompare(right.extractorId);
  });

  for (const entry of byRemainder) {
    if (assigned >= targetTotal) {
      break;
    }

    if (entry.take < entry.group.length) {
      entry.take += 1;
      assigned += 1;
    }
  }

  const selected: T[] = [];

  for (const entry of entries) {
    selected.push(...shuffle(entry.group, random).slice(0, entry.take));
  }

  return selected;
}

export function assignRoundRobin<T>(
  records: T[],
  reviewerIds: string[],
): Array<RoundRobinAssignment<T>> {
  if (reviewerIds.length === 0) {
    return [];
  }

  return records.map((record, index) => ({
    record,
    qcUserId: reviewerIds[index % reviewerIds.length],
  }));
}

function shuffle<T>(records: T[], random: () => number) {
  const copy = [...records];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swapIndex]!;
    copy[swapIndex] = current!;
  }

  return copy;
}
