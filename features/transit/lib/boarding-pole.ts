/**
 * The side of the road, shown AFTER a result exists (03 §5b).
 *
 * Upstream ships 1456 stops under 816 names because each side of a road is its
 * own pole, selected by direction of travel. The picker collapses them — median
 * separation is 11.5 m, and asking a user which side to board before they have
 * said where they are going is a question they cannot answer.
 *
 * So the pole surfaces on the result: the code printed on the physical pole, and
 * — only for the three groups that span more than 100 m — how far apart the poles
 * are. Not a second picker row.
 */

import type { StopRef, TransitSearchResult } from '@/lib/types';

/** Above this, the walk between poles is worth telling the user about. */
export const POLE_WALK_HINT_METRES = 100;

export interface BoardingPole {
  code: string;
  lat: number;
  lon: number;
  /** Rendered as a `+1` on night results that land after midnight (98 B2). */
  dayOffset: number;
}

/**
 * The boarding pole, or null when the result carries none.
 *
 * Legacy-dataset results and older API builds omit `boarding` entirely, so every
 * caller must render nothing rather than `undefined`.
 */
export function resolveBoardingPole(
  result: Pick<TransitSearchResult, 'boarding'>,
): BoardingPole | null {
  return poleFrom(result.boarding);
}

export function resolveAlightingPole(
  result: Pick<TransitSearchResult, 'alighting'>,
): BoardingPole | null {
  return poleFrom(result.alighting);
}

function poleFrom(ref: StopRef | undefined): BoardingPole | null {
  if (!ref || !ref.code) {
    return null;
  }
  return { code: ref.code, lat: ref.lat, lon: ref.lon, dayOffset: ref.dayOffset ?? 0 };
}

/** A trip that arrives after midnight gets a `+1`, from the day offset. */
export function arrivesNextDay(result: Pick<TransitSearchResult, 'boarding' | 'alighting'>): boolean {
  const board = result.boarding?.dayOffset ?? 0;
  const alight = result.alighting?.dayOffset ?? 0;
  return alight > board;
}

/** Metres between two coordinates (haversine). */
export function distanceMetres(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * How far apart the poles sharing this name are, but only when it is far enough
 * to matter. Three names in the network exceed 100 m — COVOADA (AV. 6 DE
 * JANEIRO) at 164 m, PONTA DELGADA (ALFÂNDEGA) at 134 m and P. DELGADA (FORTE
 * S. BRÁS) at 108 m. An 11 m group shows the code alone.
 */
export function poleWalkHintMetres(
  poles: { lat: number; lon: number }[],
): number | null {
  if (poles.length < 2) {
    return null;
  }
  let max = 0;
  for (let i = 0; i < poles.length; i += 1) {
    for (let j = i + 1; j < poles.length; j += 1) {
      max = Math.max(max, distanceMetres(poles[i], poles[j]));
    }
  }
  return max > POLE_WALK_HINT_METRES ? Math.round(max) : null;
}
