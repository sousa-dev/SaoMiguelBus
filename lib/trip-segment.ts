/**
 * Pick the (board, alight) pair for a trip, by sequence — 03 §5c, 98 B7.
 *
 * Resolving a stop by first occurrence is a real bug, not a simplification. On a
 * loop A -> B -> C -> D -> A, a search for C -> A finds A at index 0, decides
 * the origin comes after the destination, and throws away a valid trip. The
 * server now picks the right pair and sends `boarding.sequence` /
 * `alighting.sequence`; this module is what stops the client undoing it.
 *
 * The tie-break is byte-identical to `transit/services/matcher.py:select_pair`
 * or online and offline diverge on exactly the routes hardest to spot:
 *
 *   1. earliest BOARD          (day_offset, departure_time)
 *   2. then shortest ELAPSED DURATION, offsets included
 *   3. then board sequence, for stability
 *
 * Never stop count. On 335, with 36 repeated names, "fewest stops" selects a
 * one- or two-stop hop that is not the ride the user asked for (98 §5 ch. 4).
 *
 * `originKeys`/`destinationKeys` are SETS: a village search ("Capelas")
 * resolves to every stop-name key sharing that village's prefix, and the
 * matcher must not care whether it received one key or forty-seven —
 * mirrors `matcher.py`'s `origin_stop_ids` generalization exactly.
 */

import { stopMatchesQuery } from '@/lib/stop-match';
import type { StopRef, TransitSearchResult, TripStop } from '@/lib/types';

export const MINUTES_PER_DAY = 24 * 60;

/** One position along a trip, reduced to what pair selection needs. */
export interface SequencedStop {
  /** Identity used to match origin/destination: stop index, id or name. */
  key: string | number;
  /** 1-based position along the trip, as `StopTime.sequence`. */
  sequence: number;
  /** Absolute minutes from the trip's first calendar day. */
  minutes: number;
}

/** Absolute minutes from the trip's first calendar day (98 B2 wrap included). */
export function stopTimeMinutes(dayOffset: number, hours: number, minutes: number): number {
  return dayOffset * MINUTES_PER_DAY + hours * 60 + minutes;
}

/** Every (board, alight) on this trip where board precedes alight. */
export function validPairs<T extends SequencedStop>(
  stops: T[],
  originKeys: Set<string | number>,
  destinationKeys: Set<string | number>,
): [T, T][] {
  const boards = stops.filter((stop) => originKeys.has(stop.key));
  const alights = stops.filter((stop) => destinationKeys.has(stop.key));

  const pairs: [T, T][] = [];
  for (const board of boards) {
    for (const alight of alights) {
      if (board.sequence < alight.sequence) {
        pairs.push([board, alight]);
      }
    }
  }
  return pairs;
}

/**
 * The one pair to show for this trip, or null.
 *
 * `earliestMinutes` filters on the SELECTED BOARD STOP, not the trip's first
 * stop — a late board on a loop that departed earlier must not be dropped
 * (02 §3.4). A board on a later day always qualifies, matching the server's
 * `(day_offset, departure_time) >= (0, earliest)` tuple comparison.
 */
export function selectPair<T extends SequencedStop>(
  stops: T[],
  originKeys: Set<string | number>,
  destinationKeys: Set<string | number>,
  options: { earliestMinutes?: number } = {},
): [T, T] | null {
  let pairs = validPairs(stops, originKeys, destinationKeys);

  const earliest = options.earliestMinutes;
  if (earliest !== undefined) {
    pairs = pairs.filter(([board]) => board.minutes >= earliest);
  }
  if (pairs.length === 0) {
    return null;
  }

  return pairs.reduce((best, pair) => (rank(pair) < rank(best) ? pair : best));
}

function rank<T extends SequencedStop>(pair: [T, T]): string {
  const [board, alight] = pair;
  // Lexicographic over zero-padded keys reproduces Python's tuple comparison.
  return [
    board.minutes,
    alight.minutes - board.minutes,
    board.sequence,
  ]
    .map((value) => String(value).padStart(8, '0'))
    .join(':');
}

/**
 * Trim a full-route search result to the origin -> destination segment.
 *
 * Four paths, in order:
 *
 *   1. No sequence data (legacy dataset, older API) — the original name-matching
 *      behaviour, unchanged. This is the back-compat guarantee.
 *   2. `opts.fullStops` supplied, or the wire array is 1:1 with the sequences —
 *      slice exactly on the indices the server chose.
 *   3. Sequences present but the array is shorter than `alighting.sequence` —
 *      the API collapsed duplicate stop names on its way out (see below), so the
 *      indices cannot be trusted. NEVER return null here: dropping the trip is
 *      the very bug 98 B7 describes. Keep the server's board/alight times, do the
 *      best slice the array supports, and mark `segmentExact: false`.
 *
 * On the collapse: `search.py` serialises stops as a Python dict literal and
 * `v3.py:_parse_stops_string` reads it back with `ast.literal_eval`, so repeated
 * stop names merge — the first occurrence's position survives carrying the last
 * occurrence's time. Line 301 goes from 59 stops to 45, and `alighting.sequence`
 * 59 indexes past the end. Loop routes are exactly the ones that collapse.
 */
export function extractTripSegment(
  trip: TransitSearchResult,
  origin?: string,
  destination?: string,
  opts?: { fullStops?: TripStop[] },
): TransitSearchResult | null {
  const { boarding, alighting } = trip;
  if (!boarding || !alighting) {
    return extractByName(trip, origin, destination);
  }

  const source = opts?.fullStops ?? trip.stops ?? [];
  if (sequencesAlign(source, boarding, alighting)) {
    const stops = source.slice(boarding.sequence - 1, alighting.sequence);
    return {
      ...trip,
      start: stops[0]?.time ?? trip.start,
      end: stops[stops.length - 1]?.time ?? trip.end,
      stops,
      segmentExact: true,
    };
  }

  return {
    ...trip,
    // The server already selected the pair; its times are authoritative.
    start: trip.start,
    end: trip.end,
    stops: repairedSlice(trip, origin, destination),
    segmentExact: false,
  };
}

function sequencesAlign(stops: TripStop[], boarding: StopRef, alighting: StopRef): boolean {
  if (boarding.sequence < 1 || alighting.sequence <= boarding.sequence) {
    return false;
  }
  return stops.length >= alighting.sequence;
}

/**
 * Best-effort segment for a collapsed array: the origin occurrence followed by
 * the first destination after it. Unlike the name-matching path this never
 * bails when the destination appears first — it falls back to the two endpoints
 * the server told us about, which `buildActiveTrackFromTrip` already handles.
 */
function repairedSlice(
  trip: TransitSearchResult,
  origin?: string,
  destination?: string,
): TripStop[] {
  const originQuery = trip.origin || origin || '';
  const destQuery = trip.destination || destination || '';
  const stops = trip.stops ?? [];

  const originIndex = stops.findIndex((stop) => stopMatchesQuery(originQuery, stop.name));
  if (originIndex >= 0) {
    const destIndex = stops.findIndex(
      (stop, index) => index > originIndex && stopMatchesQuery(destQuery, stop.name),
    );
    if (destIndex > originIndex) {
      return stops.slice(originIndex, destIndex + 1);
    }
  }

  return [
    { name: originQuery, time: trip.start, sequence: trip.boarding?.sequence },
    { name: destQuery, time: trip.end, sequence: trip.alighting?.sequence },
  ];
}

/**
 * The original first-occurrence behaviour, kept verbatim for results that carry
 * no sequence data. Mirrors legacy webapp `createRouteDiv` stop filtering.
 */
function extractByName(
  trip: TransitSearchResult,
  origin?: string,
  destination?: string,
): TransitSearchResult | null {
  const originQuery = trip.origin || origin || '';
  const destQuery = trip.destination || destination || '';
  if (!originQuery || !destQuery || !trip.stops?.length) {
    return null;
  }

  let foundOrigin = false;
  let foundDestination = false;
  const segmentStops: TripStop[] = [];

  for (const stop of trip.stops) {
    if (foundOrigin) {
      segmentStops.push(stop);
    } else if (stopMatchesQuery(originQuery, stop.name)) {
      foundOrigin = true;
      segmentStops.push(stop);
    }

    if (stopMatchesQuery(destQuery, stop.name)) {
      if (!foundOrigin) {
        return null;
      }
      foundDestination = true;
      const last = segmentStops[segmentStops.length - 1];
      if (!last || last.name !== stop.name || last.time !== stop.time) {
        segmentStops.push(stop);
      }
      break;
    }
  }

  if (!foundOrigin || !foundDestination || segmentStops.length === 0) {
    return null;
  }

  const first = segmentStops[0];
  const last = segmentStops[segmentStops.length - 1];
  return {
    ...trip,
    start: first.time,
    end: last.time,
    stops: segmentStops,
  };
}
