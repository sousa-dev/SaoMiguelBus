/**
 * Origin -> destination journeys with at most one change of bus, offline.
 *
 * Port of `transit/services/journeys.py`. Pure: no AsyncStorage, no network, no
 * bundle format knowledge — callers hand it already-extracted legs, the same way
 * `lib/offline-search.ts` is split out from `lib/offline-bundle.ts` so it can be
 * tested directly.
 *
 * The server and this file must produce identical journeys for identical input.
 * That is not a nice-to-have: a rider who searches online, boards, loses signal
 * and searches again must see the same itinerary. `matcher.py` spells out the
 * same contract for pair selection. So every ordering below is TOTAL — never
 * Map iteration order, never a stable-sort assumption.
 *
 * Times are absolute minutes (`dayOffset * 1440 + h * 60 + m`) so a journey that
 * crosses midnight orders correctly (98 B2).
 */

import type { TransferNeighbours } from '@/lib/transfer-points';

/** Transfer journeys kept after pruning. Direct journeys are never capped. */
export const MAX_TRANSFER_JOURNEYS = 12;

/** Candidate second buses considered per interchange, per first leg. */
export const CONNECTIONS_PER_INTERCHANGE = 3;

/**
 * A wait long enough that this stops being one journey.
 *
 * Pareto dominance alone does not catch these, and production showed why: a
 * Capelas -> Ponta Delgada itinerary rode 2 minutes to the next stop in the SAME
 * village at 00h53, waited 5h29, then took the 06h24 bus. Nothing dominated it —
 * it departs earlier than everything else — but no rider wants it.
 *
 * Two rules, because one is not enough: the RATIO separates "2h wait on a 4h
 * journey" (a connection) from "2h wait on a 10-minute hop" (not one), and the
 * absolute ceiling catches long journeys where the ratio stays generous.
 *
 * Tuned against real São Miguel data: Saturday's only Capelas -> Furnas
 * connection waits 241 minutes and Sunday's waits 136. Both are genuinely the
 * sole option that day, so a tighter cap would put those pairs back to "no
 * connection" — the falsehood this feature exists to remove.
 */
export const MAX_TRANSFER_WAIT_MINUTES = 300;
export const MAX_WAIT_TO_RIDE_RATIO = 3;

export interface JourneyLegCandidate {
  tripId: number;
  lineCode: string;
  /** Distinct per line — two trips on one line are the same bus continuing. */
  lineId: string;
  boardStopId: number;
  alightStopId: number;
  boardSequence: number;
  alightSequence: number;
  departure: number;
  arrival: number;
}

export interface RawJourney {
  legs: JourneyLegCandidate[];
  /** Minutes at each interchange, walking included. Empty when direct. */
  waits: number[];
}

function journeyDeparture(journey: RawJourney): number {
  return journey.legs[0].departure;
}

function journeyArrival(journey: RawJourney): number {
  return journey.legs[journey.legs.length - 1].arrival;
}

function journeyTransfers(journey: RawJourney): number {
  return journey.legs.length - 1;
}

function journeyKey(journey: RawJourney): string {
  return journey.legs.map((leg) => leg.tripId).join(':');
}

/** Total order, mirroring `_sort_key` on the server. */
function compareJourneys(a: RawJourney, b: RawJourney): number {
  return (
    journeyDeparture(a) - journeyDeparture(b) ||
    journeyArrival(a) - journeyArrival(b) ||
    journeyTransfers(a) - journeyTransfers(b) ||
    compareTripIds(a, b)
  );
}

/** Element-wise, shorter-first — how Python compares the trip-id tuples. */
function compareTripIds(a: RawJourney, b: RawJourney): number {
  const left = a.legs.map((leg) => leg.tripId);
  const right = b.legs.map((leg) => leg.tripId);
  for (let i = 0; i < Math.min(left.length, right.length); i += 1) {
    if (left[i] !== right[i]) {
      return left[i] - right[i];
    }
  }
  return left.length - right.length;
}

/** First index whose departure is >= `target`. */
function lowerBound(departures: number[], target: number): number {
  let low = 0;
  let high = departures.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (departures[mid] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

export interface BoardStopIndex {
  departures: number[];
  legs: JourneyLegCandidate[];
}

/** Group legs by boarding stop, sorted so the join can binary-search. */
export function indexByBoardStop(
  legs: JourneyLegCandidate[],
): Map<number, BoardStopIndex> {
  const grouped = new Map<number, JourneyLegCandidate[]>();
  for (const leg of legs) {
    const bucket = grouped.get(leg.boardStopId);
    if (bucket) {
      bucket.push(leg);
    } else {
      grouped.set(leg.boardStopId, [leg]);
    }
  }

  const index = new Map<number, BoardStopIndex>();
  for (const [stopId, rows] of grouped) {
    rows.sort(
      (a, b) =>
        a.departure - b.departure ||
        a.arrival - b.arrival ||
        a.tripId - b.tripId ||
        a.boardSequence - b.boardSequence,
    );
    index.set(stopId, {
      departures: rows.map((leg) => leg.departure),
      legs: rows,
    });
  }
  return index;
}

export function buildTransferJourneys(
  firstLegs: JourneyLegCandidate[],
  secondIndex: Map<number, BoardStopIndex>,
  neighbours: TransferNeighbours,
  destinationStopIds: Set<number>,
): RawJourney[] {
  const journeys: RawJourney[] = [];

  for (const first of firstLegs) {
    if (destinationStopIds.has(first.alightStopId)) {
      // Already there — a direct ride, not a transfer.
      continue;
    }

    for (const [stopId, cost] of neighbours.get(first.alightStopId) ?? []) {
      const entry = secondIndex.get(stopId);
      if (!entry) {
        continue;
      }

      const position = lowerBound(entry.departures, first.arrival + cost);
      let taken = 0;

      for (let i = position; i < entry.legs.length; i += 1) {
        const second = entry.legs[i];
        if (second.lineId === first.lineId) {
          // The same line is the same bus continuing, not a change. Skip PAST
          // it rather than abandoning this interchange — the next departure may
          // well be the connection that works.
          continue;
        }

        journeys.push({
          legs: [first, second],
          waits: [second.departure - first.arrival],
        });

        // A few departures, not just the first: the second bus out may be an
        // express that overtakes it, and only the Pareto prune can tell.
        taken += 1;
        if (taken >= CONNECTIONS_PER_INTERCHANGE) {
          break;
        }
      }
    }
  }

  return journeys;
}

/**
 * One journey per set of trips — boarding as early as the area allows.
 *
 * Many first-leg alight points feed the same pair of trips (every stop the first
 * bus passes where the second is still catchable). They are one itinerary, so
 * exactly one survives, and WHICH one matters when the query named a village
 * rather than a stop.
 *
 * Searching "Capelas" resolves to 35 stops. Whichever we board at, the bus
 * reaches the interchange at the same moment — so boarding earlier costs nothing
 * in arrival time, and boarding at the FIRST one makes the journey span every
 * Capelas stop the bus serves, which is what puts them all in the stop list.
 *
 * Mirrors `_collapse_by_trip_pair` in `transit/services/journeys.py`.
 */
export function collapseByTripPair(journeys: RawJourney[]): RawJourney[] {
  const best = new Map<string, RawJourney>();

  for (const journey of journeys) {
    const key = journeyKey(journey);
    const current = best.get(key);
    if (current === undefined || spanRank(journey, current) < 0) {
      best.set(key, journey);
    }
  }

  // Map order is insertion order, which depends on input order; sort so the
  // result cannot drift from the server's.
  return [...best.values()].sort(compareJourneys);
}

/** Earliest boarding, then latest alighting — the widest ride on these trips. */
function spanRank(a: RawJourney, b: RawJourney): number {
  return (
    a.legs[0].boardSequence - b.legs[0].boardSequence ||
    b.legs[b.legs.length - 1].alightSequence -
      a.legs[a.legs.length - 1].alightSequence ||
    journeyArrival(a) - journeyArrival(b)
  );
}

/**
 * Drop any journey another one beats on every axis at once.
 *
 * Dominated means some other journey leaves no earlier, arrives no later, and
 * changes bus no more often — there is no reason a rider would pick it. This is
 * what stops a three-hour two-bus itinerary sitting next to the direct bus that
 * leaves at the same time and beats it.
 */
export function pruneDominated(journeys: RawJourney[]): RawJourney[] {
  const ordered = [...journeys].sort(compareJourneys);
  const kept: RawJourney[] = [];

  for (let index = 0; index < ordered.length; index += 1) {
    const journey = ordered[index];
    let dominated = false;

    for (let otherIndex = 0; otherIndex < ordered.length; otherIndex += 1) {
      if (otherIndex === index) {
        continue;
      }
      const other = ordered[otherIndex];
      if (
        journeyDeparture(other) >= journeyDeparture(journey) &&
        journeyArrival(other) <= journeyArrival(journey) &&
        journeyTransfers(other) <= journeyTransfers(journey)
      ) {
        const identical =
          journeyDeparture(other) === journeyDeparture(journey) &&
          journeyArrival(other) === journeyArrival(journey) &&
          journeyTransfers(other) === journeyTransfers(journey);
        if (identical) {
          // Equal on all three: keep whichever sorts first, or they would
          // eliminate each other and both disappear.
          if (otherIndex < index) {
            dominated = true;
            break;
          }
          continue;
        }
        dominated = true;
        break;
      }
    }

    if (!dominated) {
      kept.push(journey);
    }
  }

  return kept;
}

/**
 * Does this ride actually move the rider FORWARD?
 *
 * Legacy timetables contain trips whose times go backwards mid-route: line 206
 * reaches sequence 12 at 08h20 and sequence 13 at 08h10, with no day offset to
 * explain it. Sequence order cannot catch it — the sequence IS in order, only
 * the clock disagrees — and a leg arriving before it departs makes the whole
 * itinerary's arithmetic a lie.
 */
export function advancesInTime(leg: JourneyLegCandidate): boolean {
  return leg.arrival > leg.departure;
}

/** Is this still one journey, or two trips with a day in between? */
export function waitIsReasonable(journey: RawJourney): boolean {
  const wait = journey.waits.reduce((total, value) => total + value, 0);
  if (wait === 0) {
    return true;
  }
  if (wait > MAX_TRANSFER_WAIT_MINUTES) {
    return false;
  }
  const riding = journey.legs.reduce(
    (total, leg) => total + (leg.arrival - leg.departure),
    0,
  );
  return wait <= riding * MAX_WAIT_TO_RIDE_RATIO;
}

/** Rank, prune and cap. The cap applies to transfer journeys only. */
export function rankJourneys(
  direct: RawJourney[],
  transfers: RawJourney[],
  earliestDeparture: number,
): RawJourney[] {
  const candidates = [...direct, ...transfers].filter(
    (journey) =>
      journeyDeparture(journey) >= earliestDeparture && waitIsReasonable(journey),
  );
  const kept = pruneDominated(candidates);

  const directKept = kept.filter((journey) => journeyTransfers(journey) === 0);
  const transferKept = kept
    .filter((journey) => journeyTransfers(journey) > 0)
    .sort(compareJourneys)
    .slice(0, MAX_TRANSFER_JOURNEYS);

  return [...directKept, ...transferKept].sort(compareJourneys);
}
