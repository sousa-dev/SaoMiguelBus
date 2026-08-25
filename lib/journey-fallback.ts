/**
 * Degrading journey search back to direct search.
 *
 * Split out of `lib/api.ts` so it carries no react-native or network imports and
 * can be tested directly — the same discipline `lib/offline-search.ts` follows.
 *
 * Transfer search is NEW; direct search has worked for years. If the new
 * endpoint is missing or broken, a rider must still get the direct bus they
 * could always find before: showing an error for a Capelas -> Ponta Delgada
 * search because the TRANSFER scan fell over would be a straight regression.
 */

import { ApiRequestError } from '@/lib/api-errors';
import { computeVotePercents, timeStringToMinutes } from '@/lib/transit-format';
import type { TransitJourney, TransitSearchResult, TripDetail } from '@/lib/types';

/**
 * Should this failure degrade to `/transit/search` instead of surfacing?
 *
 *   404  the API has not been redeployed yet — the app ships ahead of it often
 *        enough that this is a normal state, not an error.
 *   5xx  journey search is broken in production.
 *
 * Deliberately NOT caught: network failures, which the offline path already
 * handles, and 4xx other than 404 — those mean the request itself was wrong and
 * would fail identically against `/search`.
 */
export function shouldFallBackToDirectSearch(error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) {
    return false;
  }
  return error.status === 404 || error.status >= 500;
}

/** Present a direct `/search` row as a one-leg journey. */
export function journeyFromSearchResult(result: TransitSearchResult): TransitJourney {
  const first = result.stops[0];
  const last = result.stops[result.stops.length - 1];

  return {
    id: `${result.id}-${result.boarding?.sequence ?? result.stops[0]?.sequence ?? 1}`,
    transfers: 0,
    start: result.start,
    end: result.end,
    durationMinutes: Math.max(
      0,
      timeStringToMinutes(result.end) - timeStringToMinutes(result.start),
    ),
    waitMinutes: 0,
    dayOffset: result.alighting?.dayOffset ?? 0,
    typeOfDay: result.typeOfDay,
    legs: [
      {
        kind: 'ride',
        tripId: result.id,
        route: result.route,
        likesPercent: result.likesPercent,
        dislikesPercent: result.dislikesPercent,
        information: result.information,
        board: {
          name: first?.name ?? result.origin,
          time: result.start,
          // The server's own indices, never re-matched by name (98 B7).
          sequence: result.boarding?.sequence ?? first?.sequence ?? 1,
          dayOffset: result.boarding?.dayOffset ?? 0,
        },
        alight: {
          name: last?.name ?? result.destination,
          time: result.end,
          sequence: result.alighting?.sequence ?? last?.sequence ?? result.stops.length,
          dayOffset: result.alighting?.dayOffset ?? 0,
        },
        stops: result.stops,
        // Omitted, never null, when the row carries no pole — matching the
        // server's serializer and the legacy dataset's shape.
        ...(result.boarding ? { boarding: result.boarding } : {}),
        ...(result.alighting ? { alighting: result.alighting } : {}),
      },
    ],
  };
}

/**
 * Present a trip-detail response as a one-leg journey, for the trip detail
 * screen's map.
 *
 * `GET /trips/{id}` carries no `StopRef` — no pole, no coordinates, that is
 * what the geometry endpoint answers — so board/alight here only ever carry a
 * name, time and sequence. That is enough: `JourneyMap` draws from the
 * geometry it fetches per leg, not from these stops.
 */
export function journeyFromTripDetail(detail: TripDetail): TransitJourney {
  const first = detail.stops[0];
  const last = detail.stops[detail.stops.length - 1];
  const percents =
    detail.likesPercent != null && detail.dislikesPercent != null
      ? { likesPercent: detail.likesPercent, dislikesPercent: detail.dislikesPercent }
      : computeVotePercents(detail.likes, detail.dislikes);

  return {
    // Namespaced, and deliberately NOT the `${tripId}-${sequence}` shape a
    // search journey uses. The map screen resolves a journey by scanning every
    // `['transit','search']` cache for the first id that matches, so a bare
    // `1234-1` here collides with the search result for the same trip boarded at
    // sequence 1 — and the rider asking for the WHOLE trip would silently get
    // the board..alight slice instead.
    id: `trip-detail:${detail.id}`,
    transfers: 0,
    start: first?.time ?? '',
    end: last?.time ?? '',
    durationMinutes: Math.max(
      0,
      timeStringToMinutes(last?.time ?? '') - timeStringToMinutes(first?.time ?? ''),
    ),
    waitMinutes: 0,
    dayOffset: 0,
    typeOfDay: detail.typeOfDay,
    legs: [
      {
        kind: 'ride',
        tripId: detail.id,
        route: detail.route,
        likesPercent: percents.likesPercent,
        dislikesPercent: percents.dislikesPercent,
        information: detail.information,
        board: {
          name: first?.name ?? '',
          time: first?.time ?? '',
          sequence: first?.sequence ?? 1,
          dayOffset: 0,
        },
        alight: {
          name: last?.name ?? '',
          time: last?.time ?? '',
          sequence: last?.sequence ?? detail.stops.length,
          dayOffset: 0,
        },
        stops: detail.stops,
      },
    ],
  };
}
