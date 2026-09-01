import type { StopListEntry } from '@/lib/stop-search';

/**
 * A village section header, or a stop. One flat sequence, so a sectioned list
 * can still be virtualised with a fixed row height and `getItemLayout` —
 * `SectionList` would give up that guarantee over 800 rows for nothing.
 */
export type StopSectionRow<T> =
  | { kind: 'area'; key: string; count: number; collapsed: boolean }
  | { kind: 'stop'; stop: T; indented: boolean };

/**
 * Flatten grouped entries into renderable rows.
 *
 * A collapsed section keeps its header and drops its members, so collapsing
 * changes the row count but never the section's own position — the list does
 * not reshuffle under the finger that just tapped it.
 */
export function flattenStopEntries<T>(
  entries: StopListEntry<T>[],
  collapsed: ReadonlySet<string>,
): StopSectionRow<T>[] {
  const rows: StopSectionRow<T>[] = [];

  for (const entry of entries) {
    if (entry.type === 'stop') {
      rows.push({ kind: 'stop', stop: entry.stop, indented: false });
      continue;
    }

    const isCollapsed = collapsed.has(entry.key);
    rows.push({
      kind: 'area',
      key: entry.key,
      count: entry.members.length,
      collapsed: isCollapsed,
    });
    if (isCollapsed) {
      continue;
    }
    for (const member of entry.members) {
      rows.push({ kind: 'stop', stop: member, indented: true });
    }
  }

  return rows;
}

/**
 * The stops in the order they appear, headers removed.
 *
 * This is what prev/next arrows walk, and deriving it from the same rows the
 * list renders is what keeps "next" meaning "the row below this one" — the two
 * cannot drift because there is only one sequence.
 */
export function stopsOfRows<T>(rows: StopSectionRow<T>[]): T[] {
  return rows.flatMap((row) => (row.kind === 'stop' ? [row.stop] : []));
}

/** Where a stop sits among the RENDERED rows, for `scrollToIndex`. */
export function rowIndexOfStop<T>(
  rows: StopSectionRow<T>[],
  matches: (stop: T) => boolean,
): number {
  return rows.findIndex((row) => row.kind === 'stop' && matches(row.stop));
}
