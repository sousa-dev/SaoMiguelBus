/**
 * Filtering for the stop pickers.
 *
 * No match is ever hidden. Every stop whose name contains the query is
 * returned — no relevance ranking, no cap. A village with 66 stops shows all
 * 66. The ONLY reordering is favourites, which `buildStopEntries` floats to the
 * top of whatever level they appear at; everything below them stays strictly
 * alphabetical. Floating changes the order of the list, never its contents.
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
 *
 * `favoriteIds` floats favourites to the top, at every level they appear at: a
 * favourite plain row sorts above non-favourite rows, an area containing a
 * favourite member sorts above areas that contain none, and inside an area the
 * favourite members lead. Ties break alphabetically exactly as before, so this
 * is a reordering and never a filter — pass nothing and the output is
 * byte-identical to the pre-favourites behaviour.
 */
export function buildStopEntries<T extends Pick<Stop, 'id' | 'name'>>(
  allStops: T[],
  query: string,
  favoriteIds?: ReadonlySet<number>,
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
      const matchingMembers = sortFavoritesFirst(
        areas.get(areaKey)!.filter((member) => foldForSearch(member.name).includes(q)),
        favoriteIds,
      );
      if (matchingMembers.length > 0) {
        entries.push({ type: 'area', key: areaKey, members: matchingMembers });
      }
    } else if (foldForSearch(stop.name).includes(q)) {
      entries.push({ type: 'stop', stop });
    }
  }

  return entries.sort((a, b) => {
    const rankOf = (entry: StopListEntry<T>) =>
      isFavoriteEntry(entry, favoriteIds) ? 0 : 1;
    const rankDelta = rankOf(a) - rankOf(b);
    if (rankDelta !== 0) {
      return rankDelta;
    }
    const nameOf = (entry: StopListEntry<T>) => (entry.type === 'area' ? entry.key : entry.stop.name);
    return nameOf(a).localeCompare(nameOf(b));
  });
}

/** An area counts as favourite when any of its MATCHING members is one. */
function isFavoriteEntry<T extends Pick<Stop, 'id' | 'name'>>(
  entry: StopListEntry<T>,
  favoriteIds?: ReadonlySet<number>,
): boolean {
  if (!favoriteIds || favoriteIds.size === 0) {
    return false;
  }
  return entry.type === 'area'
    ? entry.members.some((member) => favoriteIds.has(member.id))
    : favoriteIds.has(entry.stop.id);
}

/** Favourites first, then the original (already alphabetical) order. */
function sortFavoritesFirst<T extends Pick<Stop, 'id'>>(
  stops: T[],
  favoriteIds?: ReadonlySet<number>,
): T[] {
  if (!favoriteIds || favoriteIds.size === 0) {
    return stops;
  }
  return stops
    .map((stop, index) => ({ stop, index }))
    .sort((a, b) => {
      const rankDelta =
        (favoriteIds.has(a.stop.id) ? 0 : 1) - (favoriteIds.has(b.stop.id) ? 0 : 1);
      return rankDelta !== 0 ? rankDelta : a.index - b.index;
    })
    .map((wrapped) => wrapped.stop);
}

/**
 * The rows the picker shows on focus, BEFORE anything is typed: the user's
 * favourite stops, most-recently-favourited first (the order the profile store
 * keeps them in).
 *
 * Each favourite is re-resolved against the live stop list rather than
 * rendered from its stored `{id, name}`, so a row always carries a name the
 * search endpoint still accepts. Resolution is BY NAME first because ids are
 * not unique per name on the legacy network — `serialize_legacy_stops_v2`
 * emits "Ajuda" and "Ajuda - Igreja" under the same id — so an id-first lookup
 * would show the user a different stop than the one they starred. A favourite
 * with no match in the current network is dropped here (the changeover
 * migration flags it, and the profile screen still lists it); it is not
 * silently deleted, it just is not offered as something to search for.
 */
export function buildFavoriteEntries<T extends Pick<Stop, 'id' | 'name'>>(
  allStops: T[],
  favorites: readonly Pick<Stop, 'id' | 'name'>[],
): StopListEntry<T>[] {
  const byName = new Map<string, T>();
  const byId = new Map<number, T>();
  for (const stop of allStops) {
    const key = foldForSearch(stop.name);
    if (!byName.has(key)) {
      byName.set(key, stop);
    }
    if (!byId.has(stop.id)) {
      byId.set(stop.id, stop);
    }
  }

  const entries: StopListEntry<T>[] = [];
  const seen = new Set<T>();
  for (const favorite of favorites) {
    const resolved = byName.get(foldForSearch(favorite.name)) ?? byId.get(favorite.id);
    if (!resolved || seen.has(resolved)) {
      continue;
    }
    seen.add(resolved);
    entries.push({ type: 'stop', stop: resolved });
  }
  return entries;
}
