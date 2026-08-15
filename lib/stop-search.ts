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
