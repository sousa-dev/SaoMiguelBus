/**
 * The schema-versioned offline bundle: one network, date-resolved services.
 *
 * Types are taken from the deployed payload, not the plan's sketch. The
 * differences matter:
 *   - there is no `schedule` block, only a flat `phase` string, so the offline
 *     banner cannot be rendered from the bundle;
 *   - stops are `{id, name, latitude, longitude}`, not `{name, lat, lon}`;
 *   - `service`, and entries in `codes` and `stops`, are nullable.
 *
 * `services` replaces the WEEKDAY|SATURDAY|SUNDAY enum. That enum cannot express
 * line 112 (Tuesday AND Thursday only), 102's distinct Wednesday and Friday
 * extras, or 307's 33 <-> 38 school-term flip (98 B0), so the client resolves
 * eligibility for an ISO date using the server's own rule.
 */

import {
  advancesInTime,
  buildTransferJourneys,
  collapseByTripPair,
  indexByBoardStop,
  rankJourneys,
  type JourneyLegCandidate,
  type RawJourney,
} from '@/lib/journey-search';
import { normalizeStopKey } from '@/lib/offline-search';
import { findAreaByQuery, groupStopsIntoAreas } from '@/lib/stop-areas';
import {
  TIGHT_TRANSFER_MINUTES,
  buildTransferNeighbours,
  haversineM,
  walkMinutes,
} from '@/lib/transfer-points';
import { timeStringToMinutes } from '@/lib/transit-format';
import { selectPair, stopTimeMinutes, type SequencedStop } from '@/lib/trip-segment';
import type {
  TransitDataset,
  TransitJourney,
  TransitJourneyLeg,
  TransitJourneySearch,
  TransitRideLeg,
  TransitSearchResult,
  TripStop,
} from '@/lib/types';

export interface OfflineServiceRule {
  /** Mon…Sun bitstring, e.g. "1111100". */
  days: string;
  /** ISO date, inclusive. Null ⇒ unbounded. */
  from: string | null;
  to: string | null;
  added: string[];
  removed: string[];
}

export interface OfflineStopV2 {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export interface OfflineRouteRowV2 {
  id: number;
  line: string;
  /** Key into `bundle.services`. Null when a trip carries no service pattern. */
  service: string | null;
  /** Indices into `bundle.stops`; null when a stop fell outside the dataset. */
  stops: (number | null)[];
  /** Pole code per position; null on legacy rows, which have no ExternalStop. */
  codes: (string | null)[];
  /** Seconds since midnight. */
  times: number[];
  /** day_offset per position — the night wrap (98 B2). */
  offsets: number[];
}

export interface OfflineBundleV2 {
  schema: 2;
  version: string;
  generatedAt: string;
  island: string;
  /** The ONE network this bundle contains (00 Decision 4). Never a row filter. */
  dataset: TransitDataset;
  /** INSTANT, or null when no cutover is armed. */
  cutoverAt: string | null;
  nextTransitionAt: string | null;
  phase: string;
  holidays: { date: string; name: string }[];
  stops: OfflineStopV2[];
  services: Record<string, OfflineServiceRule>;
  routes: OfflineRouteRowV2[];
}

/** Monday = 0 … Sunday = 6, matching `ServicePattern.WEEKDAY_FIELDS`. */
export function mondayFirstIndex(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  // UTC, so the index cannot shift with the device's timezone.
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (weekday + 6) % 7;
}

export function isHoliday(holidays: { date: string }[], isoDate: string): boolean {
  return holidays.some((holiday) => holiday.date.slice(0, 10) === isoDate);
}

/**
 * Does this trip run on this ISO date?
 *
 * Mirrors `transit/services/search.py:eligible_trips` exactly, including two
 * things the mobile plan's sketch got wrong:
 *
 *  - On a holiday the server sets `on_date = None` and filters on the Sunday
 *    flag ALONE — no date bounds, no exceptions. Applying bounds here would make
 *    offline stricter than online on holidays.
 *  - `added` is never honoured. `eligible_trips` only excludes REMOVED; it has no
 *    branch that forces a date on. Honouring it here would make offline more
 *    permissive than online on exactly the dates nobody would think to check.
 *
 * Agreeing with the server matters more than either rule being ideal.
 */
export function runsOn(
  bundle: Pick<OfflineBundleV2, 'services' | 'holidays'>,
  row: Pick<OfflineRouteRowV2, 'service'>,
  isoDate: string,
): boolean {
  const service = row.service ? bundle.services[row.service] : undefined;
  if (!service) {
    // No pattern means no evidence that it runs. Under-inclusive is the right
    // failure for transit: a bus that is not coming strands someone at a stop.
    return false;
  }

  if (isHoliday(bundle.holidays, isoDate)) {
    return service.days[6] === '1';
  }

  if (service.from && isoDate < service.from) {
    return false;
  }
  if (service.to && isoDate > service.to) {
    return false;
  }
  if (service.removed.includes(isoDate)) {
    return false;
  }
  return service.days[mondayFirstIndex(isoDate)] === '1';
}

function formatSeconds(seconds: number): string {
  const wrapped = ((seconds % 86400) + 86400) % 86400;
  const hours = Math.floor(wrapped / 3600);
  const minutes = Math.floor((wrapped % 3600) / 60);
  return `${String(hours).padStart(2, '0')}h${String(minutes).padStart(2, '0')}`;
}

/**
 * Every stop-name key the query resolves to.
 *
 * Offline has no server to ask, so it resolves "Capelas" to the whole village
 * itself — mirroring the server's own precedence (`_resolve_stop_ids`): an
 * exact stop name always wins first, so a query naming one specific landmark
 * is never widened into its village's union. Only when nothing matches
 * exactly is the query tried against `lib/stop-areas.ts`'s village grouping
 * (the SAME module the picker's sections use — one implementation, not a
 * third divergent one). No prefix fallback: offline never had one before
 * areas existed either, and adding one now would be scope this feature
 * didn't ask for.
 *
 * Two fold domains, deliberately different, matching the plan exactly:
 * `findAreaByQuery` folds via `foldStopName` internally (the same structural
 * fold `groupStopsIntoAreas`'s collision check uses); the returned SET is
 * built from `normalizeStopKey`, because that is the key domain
 * `SequencedStop.key` already uses throughout this file (`sequencedRow`,
 * below). The two folds strip the same characters, so this is about keeping
 * the established key domain coherent, not papering over a mismatch.
 */
function resolveKeys(query: string, stops: OfflineStopV2[]): Set<string> {
  const exactKey = normalizeStopKey(query);
  const hasExactStop = stops.some((stop) => normalizeStopKey(stop.name) === exactKey);
  if (hasExactStop) {
    return new Set([exactKey]);
  }

  const members = findAreaByQuery(groupStopsIntoAreas(stops), query);
  if (members) {
    return new Set(members.map((member) => normalizeStopKey(member.name)));
  }

  // No match either way -- selectPair naturally finds nothing for this key.
  return new Set([exactKey]);
}

function sequencedRow(row: OfflineRouteRowV2, stops: OfflineStopV2[]): SequencedStop[] {
  return row.stops.map((stopIndex, position) => {
    const seconds = row.times[position] ?? 0;
    return {
      key: stopIndex == null ? `__missing_${position}` : normalizeStopKey(stops[stopIndex]?.name ?? ''),
      sequence: position + 1,
      minutes: stopTimeMinutes(
        row.offsets[position] ?? 0,
        Math.floor(seconds / 3600),
        Math.floor((seconds % 3600) / 60),
      ),
    };
  });
}

/**
 * Offline search over one date. Shares `selectPair` with the online path so the
 * two cannot disagree about which leg of a loop to show (98 B7).
 */
export function offlineSearchV2(
  bundle: OfflineBundleV2,
  params: { origin: string; destination: string; isoDate: string },
): TransitSearchResult[] {
  const originKeys = resolveKeys(params.origin, bundle.stops);
  const destinationKeys = resolveKeys(params.destination, bundle.stops);

  const results: TransitSearchResult[] = [];
  for (const row of bundle.routes) {
    if (!runsOn(bundle, row, params.isoDate)) {
      continue;
    }
    const pair = selectPair(sequencedRow(row, bundle.stops), originKeys, destinationKeys);
    if (!pair) {
      continue;
    }

    const [board, alight] = pair;
    const segment: TripStop[] = [];
    for (let position = board.sequence - 1; position < alight.sequence; position += 1) {
      const stopIndex = row.stops[position];
      segment.push({
        name: stopIndex == null ? '' : bundle.stops[stopIndex]?.name ?? '',
        time: formatSeconds(row.times[position] ?? 0),
        sequence: position + 1,
      });
    }

    results.push({
      id: row.id,
      route: row.line,
      origin: params.origin,
      destination: params.destination,
      start: formatSeconds(row.times[board.sequence - 1] ?? 0),
      end: formatSeconds(row.times[alight.sequence - 1] ?? 0),
      typeOfDay: params.isoDate,
      likesPercent: 0,
      dislikesPercent: 0,
      information: {},
      stops: segment,
      boarding: poleRef(row, board.sequence),
      alighting: poleRef(row, alight.sequence),
      segmentExact: true,
    });
  }
  return results;
}

/**
 * Bundle stop ids the query resolves to.
 *
 * `resolveKeys` works in normalized-NAME space, which is right for `selectPair`,
 * but the transfer scan works in STOP ID space like the server does. The
 * pole-collapse guarantees one `Stop` row per distinct name within a dataset, so
 * the two spaces map 1:1 here.
 */
function resolveStopIds(query: string, stops: OfflineStopV2[]): Set<number> {
  const keys = resolveKeys(query, stops);
  const ids = new Set<number>();
  for (const stop of stops) {
    if (keys.has(normalizeStopKey(stop.name))) {
      ids.add(stop.id);
    }
  }
  return ids;
}

/** Absolute minutes for one position in a route row, midnight wrap included. */
function positionMinutes(row: OfflineRouteRowV2, position: number): number {
  const seconds = row.times[position] ?? 0;
  return stopTimeMinutes(
    row.offsets[position] ?? 0,
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
  );
}

function legCandidate(
  row: OfflineRouteRowV2,
  stops: OfflineStopV2[],
  boardPosition: number,
  alightPosition: number,
): JourneyLegCandidate | null {
  const boardStop = row.stops[boardPosition];
  const alightStop = row.stops[alightPosition];
  if (boardStop == null || alightStop == null) {
    return null;
  }
  return {
    tripId: row.id,
    lineCode: row.line,
    // Line CODE stands in for the server's line id: within one dataset the two
    // are 1:1 (`unique_together` on island+dataset+code).
    lineId: row.line,
    boardStopId: stops[boardStop]?.id ?? -1,
    alightStopId: stops[alightStop]?.id ?? -1,
    boardSequence: boardPosition + 1,
    alightSequence: alightPosition + 1,
    departure: positionMinutes(row, boardPosition),
    arrival: positionMinutes(row, alightPosition),
  };
}

function segmentStops(
  row: OfflineRouteRowV2,
  stops: OfflineStopV2[],
  fromSequence: number,
  toSequence: number,
): TripStop[] {
  const segment: TripStop[] = [];
  for (let position = fromSequence - 1; position < toSequence; position += 1) {
    const stopIndex = row.stops[position];
    segment.push({
      name: stopIndex == null ? '' : stops[stopIndex]?.name ?? '',
      time: formatSeconds(row.times[position] ?? 0),
      sequence: position + 1,
    });
  }
  return segment;
}

function rideLeg(
  leg: JourneyLegCandidate,
  rowsById: Map<number, OfflineRouteRowV2>,
  stops: OfflineStopV2[],
): TransitRideLeg {
  const row = rowsById.get(leg.tripId)!;
  const boardStop = row.stops[leg.boardSequence - 1];
  const alightStop = row.stops[leg.alightSequence - 1];
  return {
    kind: 'ride',
    tripId: leg.tripId,
    route: leg.lineCode,
    // The bundle carries no vote counts, so nothing here can claim confidence.
    likesPercent: 0,
    dislikesPercent: 0,
    information: {},
    board: {
      name: boardStop == null ? '' : stops[boardStop]?.name ?? '',
      time: formatSeconds(row.times[leg.boardSequence - 1] ?? 0),
      sequence: leg.boardSequence,
      dayOffset: row.offsets[leg.boardSequence - 1] ?? 0,
    },
    alight: {
      name: alightStop == null ? '' : stops[alightStop]?.name ?? '',
      time: formatSeconds(row.times[leg.alightSequence - 1] ?? 0),
      sequence: leg.alightSequence,
      dayOffset: row.offsets[leg.alightSequence - 1] ?? 0,
    },
    stops: segmentStops(row, stops, leg.boardSequence, leg.alightSequence),
    // Omitted, never null, when the row carries no pole — legacy rows have no
    // ExternalStop, and the server's serializer drops the keys the same way.
    ...(row.codes[leg.boardSequence - 1] ? { boarding: poleRef(row, leg.boardSequence) } : {}),
    ...(row.codes[leg.alightSequence - 1] ? { alighting: poleRef(row, leg.alightSequence) } : {}),
  };
}

function toJourney(
  raw: RawJourney,
  rowsById: Map<number, OfflineRouteRowV2>,
  stops: OfflineStopV2[],
  isoDate: string,
): TransitJourney {
  const legs: TransitJourneyLeg[] = [];

  const rides = raw.legs.map((leg) => rideLeg(leg, rowsById, stops));
  const byId = new Map(stops.map((stop) => [stop.id, stop]));

  rides.forEach((ride, index) => {
    if (index > 0) {
      const previous = raw.legs[index - 1];
      const current = raw.legs[index];
      const from = byId.get(previous.alightStopId);
      const to = byId.get(current.boardStopId);
      const wait = raw.waits[index - 1];
      const walk =
        from && to && from.id !== to.id
          ? walkMinutes(
              haversineM(from.latitude, from.longitude, to.latitude, to.longitude),
            )
          : 0;
      // Never negative: the scan already refused any connection that did not
      // clear the walk plus the buffer.
      const slack = Math.max(0, wait - walk);
      legs.push({
        kind: 'transfer',
        at: ride.board.name,
        from: rides[index - 1].alight.name,
        waitMinutes: wait,
        walkMinutes: walk,
        slackMinutes: slack,
        tight: slack < TIGHT_TRANSFER_MINUTES,
        fromRoute: previous.lineCode,
        toRoute: current.lineCode,
      });
    }
    legs.push(ride);
  });

  const first = raw.legs[0];
  const last = raw.legs[raw.legs.length - 1];
  const lastRow = rowsById.get(last.tripId)!;

  return {
    id: raw.legs.map((leg) => leg.tripId).join(':'),
    transfers: raw.legs.length - 1,
    start: formatSeconds(rowsById.get(first.tripId)!.times[first.boardSequence - 1] ?? 0),
    end: formatSeconds(lastRow.times[last.alightSequence - 1] ?? 0),
    durationMinutes: last.arrival - first.departure,
    waitMinutes: raw.waits.reduce((total, wait) => total + wait, 0),
    dayOffset: lastRow.offsets[last.alightSequence - 1] ?? 0,
    typeOfDay: isoDate,
    legs,
  };
}

/**
 * Offline journey search: direct rides AND one-transfer itineraries.
 *
 * Mirrors `transit/services/journeys.py`. `offlineSearchV2` stays as it is —
 * `/transit/search`, the v1 bundle and trip detail all still speak the flat
 * single-trip shape.
 */
export function offlineJourneySearchV2(
  bundle: OfflineBundleV2,
  params: {
    origin: string;
    destination: string;
    isoDate: string;
    start?: string;
    /** 0 = one bus only. Defaults to allowing one change, as the server does. */
    maxTransfers?: number;
  },
): TransitJourneySearch {
  const maxTransfers = Math.max(0, Math.min(params.maxTransfers ?? 1, 1));
  const empty: TransitJourneySearch = { journeys: [], maxTransfers };

  const originIds = resolveStopIds(params.origin, bundle.stops);
  const destinationIds = resolveStopIds(params.destination, bundle.stops);
  if (originIds.size === 0 || destinationIds.size === 0) {
    // Nothing resolves, so a change of bus cannot help either — an honest zero
    // rather than a prompt that would find nothing.
    return maxTransfers === 0 ? { ...empty, transfersAvailable: 0 } : empty;
  }

  // Somewhere to itself is not a journey. Compared as SETS, so a query naming
  // two different stops in one village is still a real, if short, ride.
  if (
    originIds.size === destinationIds.size &&
    [...originIds].every((id) => destinationIds.has(id))
  ) {
    return maxTransfers === 0 ? { ...empty, transfersAvailable: 0 } : empty;
  }

  const rows = bundle.routes
    .filter((row) => runsOn(bundle, row, params.isoDate))
    // Trip id order, matching the server's `.order_by('id')`, so equal-ranked
    // journeys break their tie the same way on both sides.
    .sort((a, b) => a.id - b.id);
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  const originKeySet = resolveKeys(params.origin, bundle.stops);
  const destinationKeySet = resolveKeys(params.destination, bundle.stops);

  const direct: RawJourney[] = [];
  const firstLegs: JourneyLegCandidate[] = [];
  const secondLegs: JourneyLegCandidate[] = [];

  for (const row of rows) {
    // Direct rides go through `selectPair`, exactly as the server routes them
    // through its own — one row per trip, and the loop tie-break stays in the
    // one place that owns it.
    const pair = selectPair(sequencedRow(row, bundle.stops), originKeySet, destinationKeySet);
    if (pair) {
      const candidate = legCandidate(row, bundle.stops, pair[0].sequence - 1, pair[1].sequence - 1);
      if (candidate && advancesInTime(candidate)) {
        direct.push({ legs: [candidate], waits: [] });
      }
    }

    for (let position = 0; position < row.stops.length; position += 1) {
      const stopIndex = row.stops[position];
      const stopId = stopIndex == null ? -1 : bundle.stops[stopIndex]?.id ?? -1;

      if (originIds.has(stopId)) {
        for (let later = position + 1; later < row.stops.length; later += 1) {
          const candidate = legCandidate(row, bundle.stops, position, later);
          if (candidate && advancesInTime(candidate)) {
            firstLegs.push(candidate);
          }
        }
      }

      if (destinationIds.has(stopId)) {
        for (let earlier = 0; earlier < position; earlier += 1) {
          const candidate = legCandidate(row, bundle.stops, earlier, position);
          if (candidate && advancesInTime(candidate)) {
            secondLegs.push(candidate);
          }
        }
      }
    }
  }

  const earliest = params.start ? timeStringToMinutes(params.start) : 0;

  const findTransfers = () =>
    collapseByTripPair(
      buildTransferJourneys(
        firstLegs,
        indexByBoardStop(secondLegs),
        buildTransferNeighbours(bundle.stops),
        destinationIds,
      ),
    );

  const transfers = maxTransfers >= 1 ? findTransfers() : [];
  const ranked = rankJourneys(direct, transfers, earliest);
  const journeys = ranked.map((raw) =>
    toJourney(raw, rowsById, bundle.stops, params.isoDate),
  );

  // Only when direct-only came up empty: run the scan we skipped, purely to say
  // how many itineraries a change WOULD find. That is what lets the app offer a
  // retry it knows will succeed instead of guessing.
  if (maxTransfers === 0 && journeys.length === 0) {
    const available = rankJourneys(direct, findTransfers(), earliest).filter(
      (raw) => raw.legs.length > 1,
    );
    return { journeys, maxTransfers, transfersAvailable: available.length };
  }

  return { journeys, maxTransfers };
}

function poleRef(row: OfflineRouteRowV2, sequence: number) {
  const position = sequence - 1;
  return {
    code: row.codes[position] ?? '',
    lat: 0,
    lon: 0,
    sequence,
    dayOffset: row.offsets[position] ?? 0,
  };
}

export type BundleFreshness = 'fresh' | 'expired';

/**
 * Has this bundle outlived the network it describes? (03 §5.2)
 *
 * The bundle carries ONE network. A pre-cutover bundle used after the cutover
 * describes buses that no longer run — showing those silently is worse than
 * saying nothing, so `expired` is a UI state, not a filter.
 *
 * Instants, never local calendar dates: a phone still on Lisbon time would
 * otherwise mark the bundle expired an hour before Azores midnight.
 */
export function bundleFreshness(
  bundle: Pick<OfflineBundleV2, 'cutoverAt' | 'dataset'>,
  now: number = Date.now(),
): BundleFreshness {
  if (!bundle.cutoverAt) {
    return 'fresh';
  }
  if (bundle.dataset !== 'legacy') {
    return 'fresh';
  }
  const cutover = Date.parse(bundle.cutoverAt);
  if (!Number.isFinite(cutover)) {
    return 'fresh';
  }
  return now >= cutover ? 'expired' : 'fresh';
}

/**
 * The holiday list must span the dates the `services` rules cover, or the
 * holiday→Sunday branch is wrong for every date that matters. Production shipped
 * a list ending 2025-06-19 as recently as 2026-08-14.
 */
export function isBundleHolidayCoverageStale(
  bundle: Pick<OfflineBundleV2, 'holidays'>,
  now: number = Date.now(),
): boolean {
  if (bundle.holidays.length === 0) {
    return true;
  }
  const latest = bundle.holidays.reduce(
    (max, holiday) => (holiday.date > max ? holiday.date : max),
    '',
  );
  return latest < new Date(now).toISOString().slice(0, 10);
}

/**
 * A parsed bundle, or null.
 *
 * The checks are deliberately structural. A payload the parser accepts but cannot
 * search is worse than no payload at all, because the write path would replace a
 * good bundle with it.
 */
export function parseBundle(text: string): OfflineBundleV2 | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const bundle = parsed as OfflineBundleV2 | null;
  if (
    !bundle ||
    bundle.schema !== 2 ||
    typeof bundle.version !== 'string' ||
    !Array.isArray(bundle.stops) ||
    !Array.isArray(bundle.routes) ||
    !Array.isArray(bundle.holidays) ||
    typeof bundle.services !== 'object' ||
    bundle.services === null
  ) {
    return null;
  }
  return bundle;
}

export type OfflineUiState = 'ready' | 'expired' | 'empty';

/**
 * What the offline results area should show (03 §5.2).
 *
 * `expired` hides results behind an explicit panel rather than filtering them:
 * showing departures for buses that no longer run is worse than saying nothing.
 * The "show anyway" escape hatch exists because a tourist with no signal is badly
 * served by a blank screen — `showAnyway` is the user having taken it.
 */
export function resolveOfflineUiState(
  bundle: Pick<OfflineBundleV2, 'cutoverAt' | 'dataset' | 'routes'> | null | undefined,
  options: { showAnyway?: boolean; now?: number } = {},
): OfflineUiState {
  if (!bundle || bundle.routes.length === 0) {
    return 'empty';
  }
  if (options.showAnyway) {
    return 'ready';
  }
  return bundleFreshness(bundle, options.now ?? Date.now()) === 'expired' ? 'expired' : 'ready';
}

/**
 * Only a genuinely absent endpoint downgrades a client to the v1 payload.
 *
 * `refreshOfflineBundle` fell back on ANY thrown error, so a 5xx or a schema the
 * parser choked on silently dropped a client onto the single-network v2 compat
 * load (98 B3). A transient failure must keep the existing bundle instead.
 */
export function shouldDowngradeToV1(error: unknown): boolean {
  const status = (error as { status?: number } | null | undefined)?.status;
  return status === 404 || status === 501;
}
