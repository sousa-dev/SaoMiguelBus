/**
 * Filtering for the stop pickers.
 *
 * No match is ever hidden. Every stop whose name contains the query is
 * returned, alphabetically — no relevance ranking, no cap, no favourites
 * floating to the top. A village with 66 stops shows all 66.
 *
 * That makes two things load-bearing, both here rather than left to the
 * component to get right independently:
 *
 *   - a MINIMUM QUERY LENGTH, so a one- or two-letter prefix does not run a
 *     match against 816 similarly-named AzoresBus stops before the user has
 *     finished typing what they mean;
 *   - the component debounces input by SEARCH_DEBOUNCE_MS before calling this,
 *     so the same is true between keystrokes, not just below the minimum.
 */

import { groupStopsIntoAreas } from '@/lib/stop-areas';
import type { Stop } from '@/lib/types';

/** Below this many characters, nothing is matched — see the module doc. */
export const MIN_QUERY_LENGTH = 3;

/** How long the component waits after the last keystroke before filtering. */
export const SEARCH_DEBOUNCE_MS = 300;

const ACCENTS = 'áàâãäéèêëíìîïóòôõöúùûüç';
const PLAIN = 'aaaaaeeeeiiiiooooouuuuc';

/** Fold for MATCHING only — never for deciding whether two stops share a name. */
export function foldForSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[áàâãäéèêëíìîïóòôõöúùûüç]/g, (ch) => PLAIN[ACCENTS.indexOf(ch)] ?? ch)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Every stop whose name contains the query, in alphabetical order.
 *
 * Empty below `MIN_QUERY_LENGTH`. Otherwise unfiltered by rank and uncapped: a
 * mid-name match is exactly as visible as a prefix match, and a query that
 * matches 200 stops returns 200 stops.
 */
export function filterStops<T extends Pick<Stop, 'name'>>(stops: T[], query: string): T[] {
  const q = foldForSearch(query);
  if (q.length < MIN_QUERY_LENGTH) {
    return [];
  }
  return [...stops]
    .filter((stop) => foldForSearch(stop.name).includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A plain stop, or a village section — see `buildStopEntries`. */
export type StopListEntry<T> =
  | { type: 'stop'; stop: T }
  | { type: 'area'; key: string; members: T[] };

/**
 * What the picker shows for a query: sections for real villages (AzoresBus),
 * plain rows for everything else — legacy included, since it has no
 * groupable names and this degrades to exactly `filterStops`'s output.
 *
 * Grouping runs over the FULL, unfiltered stop list — membership must not
 * depend on the query — then each stop is visited once: a stop with no area
 * becomes a plain entry if it matches; a stop WITH an area triggers that
 * area's entry exactly once (first-seen), filtering its members by the same
 * query. Every member's name is structurally `key + ' (' + ...`, so a query
 * that matches the area name transitively matches every member too — no
 * special case needed for "typed the village, see everything" vs "typed a
 * landmark word only some villages contain, see only those."
 *
 * Selecting the area entry needs no further resolution here: its `key` is
 * sent to `/api/v3/transit/search` exactly like any other suggestion, and the
 * server does its own, identical union (`_resolve_stop_ids`). This module
 * only decides what to display.
 *
 * Sorted by each entry's own display name — an area sorts by its key, not
 * pulled into a separate "areas first" block.
 */
export function buildStopEntries<T extends Pick<Stop, 'id' | 'name'>>(
  allStops: T[],
  query: string,
): StopListEntry<T>[] {
  const q = foldForSearch(query);
  if (q.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const areas = groupStopsIntoAreas(allStops);
  const areaByStop = new Map<T, string>();
  for (const [key, members] of areas) {
    for (const member of members) {
      areaByStop.set(member, key);
    }
  }

  const entries: StopListEntry<T>[] = [];
  const emittedAreaKeys = new Set<string>();

  for (const stop of allStops) {
    const areaKey = areaByStop.get(stop);
    if (areaKey) {
      if (emittedAreaKeys.has(areaKey)) {
        continue;
      }
      emittedAreaKeys.add(areaKey);
      const matchingMembers = areas
        .get(areaKey)!
        .filter((member) => foldForSearch(member.name).includes(q));
      if (matchingMembers.length > 0) {
        entries.push({ type: 'area', key: areaKey, members: matchingMembers });
      }
    } else if (foldForSearch(stop.name).includes(q)) {
      entries.push({ type: 'stop', stop });
    }
  }

  return entries.sort((a, b) => {
    const nameOf = (entry: StopListEntry<T>) => (entry.type === 'area' ? entry.key : entry.stop.name);
    return nameOf(a).localeCompare(nameOf(b));
  });
}
