/**
 * Village-level ("area") grouping — the TS mirror of
 * `azoresbus/services_stops.py`'s `derive_area_key`/`build_area_index` on the
 * API repo. Same rule, contract-tested against the same real, verbatim-copied
 * fixture on both sides (`__tests__/fixtures/azoresbus/stops.json`), because
 * two independent implementations of a string-normalization rule are exactly
 * the kind of thing that silently diverges otherwise.
 *
 * A different axis from the pole-collapse the backend does at IMPORT time
 * (1456 physical poles merge into 816 `Stop` rows by EXACT name). This groups
 * those already-collapsed 816 names by a shared VILLAGE PREFIX, for SEARCH:
 * "CAPELAS (IGREJA)", "CAPELAS (MOAGEM)" and 33 others share the key
 * "CAPELAS", so a search for "Capelas" can union every stop in the village.
 * Never merges two real stops into one.
 *
 * Generic over any `{name}`-bearing shape, so this serves BOTH the online
 * picker's `Stop[]` and the offline bundle's `OfflineStopV2[]` — one
 * implementation, not a third divergent one.
 */

import { foldStopName } from '@/lib/stop-match';

/**
 * The village prefix a stop name declares, or null if it declares none.
 *
 * Splits on the FIRST " (" rather than requiring the string to end in ")" --
 * "ARRIFES (LG. DO BOM DESPACHO) 1" must still group under ARRIFES despite the
 * trailing pole number after the closing paren. A bare name with no "(" at all
 * (e.g. "ACHADINHA") declares no area of its own.
 */
export function deriveAreaKey(name: string): string | null {
  const splitAt = name.indexOf(' (');
  if (splitAt === -1) {
    return null;
  }
  return name.slice(0, splitAt).trim();
}

/**
 * Map a RAW village key (as it should be DISPLAYED — e.g. "CAPELAS", not
 * folded) to every stop sharing it.
 *
 * Two rules, both load-bearing, mirroring the backend exactly:
 *
 *   - Only keys with 2+ members are offered. A single stop whose name happens
 *     to have a "(" suffix gains nothing from being called an "area" — the
 *     existing exact/prefix stop lookup already finds it.
 *   - A key is dropped entirely if some OTHER stop's name, exactly and on its
 *     own, equals that key once folded. There is no way for "Aflitos" to mean
 *     "the one bare stop" from one tap and "the whole village" from another,
 *     so where that ambiguity would exist, the area is not offered and the
 *     bare stop keeps its existing, precise, unchanged behaviour.
 *
 * Folding (via `foldStopName`, NOT `foldForSearch` — this is a STRUCTURAL
 * comparison, and only `foldStopName` strips hyphens the way the backend's
 * `clean_string` does) happens BEFORE grouping, not after: two raw keys that
 * only differ by accent or case must land in the same bucket first, or each
 * looks like a lone, sub-2 singleton and both get dropped.
 */
export function groupStopsIntoAreas<T extends { name: string }>(
  stops: T[],
): Map<string, T[]> {
  const byFoldedKey = new Map<string, { rawKey: string; members: T[] }>();
  const bareFoldedNames = new Set<string>();

  for (const stop of stops) {
    const key = deriveAreaKey(stop.name);
    if (key) {
      const folded = foldStopName(key);
      const bucket = byFoldedKey.get(folded);
      if (bucket) {
        bucket.members.push(stop);
      } else {
        byFoldedKey.set(folded, { rawKey: key, members: [stop] });
      }
    } else {
      bareFoldedNames.add(foldStopName(stop.name));
    }
  }

  const areas = new Map<string, T[]>();
  for (const [folded, { rawKey, members }] of byFoldedKey) {
    if (members.length >= 2 && !bareFoldedNames.has(folded)) {
      areas.set(rawKey, members);
    }
  }
  return areas;
}

/**
 * The members of the area whose (folded) key matches the query, or null.
 *
 * Only needed where there is no server to resolve the query instead — the
 * online picker sends the raw text straight to `/api/v3/transit/search`,
 * which does its own, identical resolution. Offline search has no server to
 * ask, so `offlineSearchV2` uses this directly.
 */
export function findAreaByQuery<T extends { name: string }>(
  areas: Map<string, T[]>,
  query: string,
): T[] | null {
  const folded = foldStopName(query);
  for (const [key, members] of areas) {
    if (foldStopName(key) === folded) {
      return members;
    }
  }
  return null;
}
