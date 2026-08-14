/**
 * Upstream AzoresBus journey fixtures, copied verbatim from the API repo
 * (`src/azoresbus/tests/fixtures/`). Never re-captured, never fetched.
 *
 * These helpers reproduce, exactly, what the API does to a journey on its way to
 * the app so a test can assert against the real wire shape:
 *
 *   1. `withDayOffsets` — upstream wraps past midnight by resetting
 *      `departureTime` to 0 rather than exceeding 86400 (98 B2), so the day
 *      offset is derived from a DECREASE along `sequence`.
 *   2. `collapsedStops` — `search.py` emits the stop list as a Python dict
 *      literal and `v3.py:_parse_stops_string` reads it back with
 *      `ast.literal_eval`, so duplicate stop names COLLAPSE: the first
 *      occurrence's position survives carrying the last occurrence's time.
 *      On line 301 that turns 59 stops into 45.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { StopRef, TransitSearchResult, TripStop } from '@/lib/types';

const FIXTURE_DIR = join(process.cwd(), '__tests__', 'fixtures', 'azoresbus');

interface UpstreamCirculation {
  sequence: number;
  departureTime: number;
  stage: {
    id: string;
    name: string;
    nameShort: string;
    position: { lat: number; lon: number };
  };
}

export interface UpstreamJourney {
  id: string;
  start: string;
  end: string;
  circulations: UpstreamCirculation[];
}

/** One StopTime as the importer would persist it. */
export interface FixtureStopTime {
  name: string;
  code: string;
  lat: number;
  lon: number;
  sequence: number;
  seconds: number;
  dayOffset: number;
}

export function loadJourney(file: string): UpstreamJourney {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, file), 'utf8')) as UpstreamJourney;
}

function formatTime(seconds: number): string {
  const wrapped = ((seconds % 86400) + 86400) % 86400;
  const hours = Math.floor(wrapped / 3600);
  const minutes = Math.floor((wrapped % 3600) / 60);
  return `${String(hours).padStart(2, '0')}h${String(minutes).padStart(2, '0')}`;
}

/** Ordered stop times with the night wrap resolved into a day offset (98 B2). */
export function withDayOffsets(journey: UpstreamJourney): FixtureStopTime[] {
  const ordered = [...journey.circulations].sort((a, b) => a.sequence - b.sequence);
  let dayOffset = 0;
  let previous: number | null = null;
  return ordered.map((row) => {
    if (previous !== null && row.departureTime < previous) {
      dayOffset += 1;
    }
    previous = row.departureTime;
    return {
      name: row.stage.name,
      code: row.stage.nameShort,
      lat: row.stage.position.lat,
      lon: row.stage.position.lon,
      sequence: row.sequence,
      seconds: row.departureTime,
      dayOffset,
    };
  });
}

/** The full, un-collapsed stop list — what the API *should* send. */
export function fullStops(rows: FixtureStopTime[]): TripStop[] {
  return rows.map((row) => ({
    name: row.name,
    time: formatTime(row.seconds),
    sequence: row.sequence,
  }));
}

/**
 * What the API actually sends: a dict round-trip that collapses duplicate names,
 * keeping the FIRST position and the LAST value.
 */
export function collapsedStops(rows: FixtureStopTime[]): TripStop[] {
  const byName = new Map<string, string>();
  for (const row of rows) {
    byName.set(row.name, formatTime(row.seconds));
  }
  return [...byName.entries()].map(([name, time]) => ({ name, time }));
}

function stopRef(row: FixtureStopTime): StopRef {
  return {
    code: row.code,
    lat: row.lat,
    lon: row.lon,
    sequence: row.sequence,
    dayOffset: row.dayOffset,
  };
}

/**
 * A search result in the shape `/api/v3/transit/search` returns for an
 * AzoresBus trip: `start`/`end` are the SELECTED board and alight times, `stops`
 * is the collapsed array, and the sequence indices point into the real list.
 */
export function toSearchResult(
  rows: FixtureStopTime[],
  options: {
    id: number;
    route: string;
    origin: string;
    destination: string;
    boardSequence: number;
    alightSequence: number;
    /** Omit the sequence data, as legacy-dataset results do. */
    withoutSequences?: boolean;
    /** Send the un-collapsed list, as the API would once fixed. */
    uncollapsed?: boolean;
  },
): TransitSearchResult {
  const board = rows.find((row) => row.sequence === options.boardSequence);
  const alight = rows.find((row) => row.sequence === options.alightSequence);
  if (!board || !alight) {
    throw new Error('fixture does not contain the requested sequence pair');
  }

  const result: TransitSearchResult = {
    id: options.id,
    route: options.route,
    origin: options.origin,
    destination: options.destination,
    start: formatTime(board.seconds),
    end: formatTime(alight.seconds),
    typeOfDay: 'WEEKDAY',
    likesPercent: 100,
    dislikesPercent: 0,
    information: {},
    stops: options.uncollapsed ? fullStops(rows) : collapsedStops(rows),
  };

  if (!options.withoutSequences) {
    result.boarding = stopRef(board);
    result.alighting = stopRef(alight);
  }
  return result;
}
