/**
 * Ranking and limiting for the stop pickers.
 *
 * The old rule — filter by substring, sort alphabetically, cut at 40 — was sized
 * for a 108-stop legacy network. AzoresBus has 816 stops named
 * "VILLAGE (STREET)", so a user typing a village name matches dozens: 66 for
 * "ribeira", 47 for "arrifes", 36 for "capelas". Cutting at 40 alphabetically
 * silently hid the rest, and alphabetical order buried the stop whose name IS
 * the query under its own sub-stops.
 *
 * So: rank by how well the match fits, and only cap far enough out that the cap
 * is a safety valve rather than an editorial decision.
 */

import type { Stop } from '@/lib/types';

/** High enough that a village-name query shows every stop in that village. */
export const STOP_SUGGESTION_LIMIT = 250;

const ACCENTS = 'áàâãäéèêëíìîïóòôõöúùûüç';
const PLAIN = 'aaaaaeeeeiiiiooooouuuuc';

/** Fold for MATCHING only — never for deciding whether two stops are the same. */
export function foldForSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[áàâãäéèêëíìîïóòôõöúùûüç]/g, (ch) => PLAIN[ACCENTS.indexOf(ch)] ?? ch)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lower sorts first. */
function matchRank(name: string, query: string): number {
  if (name === query) return 0;                    // exact
  if (name.startsWith(query)) return 1;            // "capelas" -> "capelas (igreja)"
  if (name.includes(` ${query}`)) return 2;        // word start
  if (name.includes(query)) return 3;              // anywhere
  return 4;                                        // no match
}

export interface RankedStopOptions {
  favoriteIds?: Set<number>;
  limit?: number;
}

/**
 * The stops to offer for a query, best match first.
 *
 * Favourites still float to the top, but only among stops that actually match —
 * a favourite is a shortcut, not a reason to show an irrelevant stop.
 */
export function rankStopSuggestions<T extends Pick<Stop, 'id' | 'name'>>(
  stops: T[],
  query: string,
  options: RankedStopOptions = {},
): T[] {
  const favoriteIds = options.favoriteIds ?? new Set<number>();
  const limit = options.limit ?? STOP_SUGGESTION_LIMIT;
  const q = foldForSearch(query);

  const scored = (q ? stops.filter((s) => matchRank(foldForSearch(s.name), q) < 4) : stops)
    .map((stop) => ({
      stop,
      rank: q ? matchRank(foldForSearch(stop.name), q) : 0,
      favorite: favoriteIds.has(stop.id) ? 0 : 1,
    }));

  scored.sort(
    (a, b) =>
      a.favorite - b.favorite ||
      a.rank - b.rank ||
      a.stop.name.localeCompare(b.stop.name),
  );

  return scored.slice(0, limit).map((entry) => entry.stop);
}
