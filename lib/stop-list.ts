/**
 * Which stops the pickers list.
 *
 * The ONLY reason to drop a stop is that a stop with the same name is already
 * listed — two identical rows help nobody choose. Proximity is never a reason:
 * distinct names are distinct places as far as the user is concerned, and the
 * network is full of stops metres apart with different names.
 *
 * This replaces a dedupe keyed on the stop ID. `serialize_legacy_stops_v2` emits
 * each stop under its full name and then a second row per distinct short name
 * ("Ajuda" for "Ajuda - Igreja") REUSING the same id, so keying on the id threw
 * away 13 searchable names on the legacy network. Measured against the deployed
 * API: legacy goes from 108 listed names to 121, AzoresBus stays at 816 (its
 * names are already one per stop), and in neither network does a name map to
 * more than one stop id — so this can never merge two different places.
 *
 * The collapse that DOES matter — 1456 upstream poles to 816 places — happens at
 * import and is likewise keyed on the exact name (`azoresbus/services_stops.py`).
 * Distance is only used there to flag wide groups for a walking hint, never to
 * group them.
 */

import type { Stop } from '@/lib/types';

/** Case- and whitespace-insensitive, but accent-sensitive: accents distinguish places. */
function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function dedupeStopsByName<T extends Pick<Stop, 'name'>>(stops: T[]): T[] {
  const seen = new Set<string>();
  const kept: T[] = [];
  for (const stop of stops) {
    const key = nameKey(stop?.name ?? '');
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    kept.push(stop);
  }
  return kept;
}
