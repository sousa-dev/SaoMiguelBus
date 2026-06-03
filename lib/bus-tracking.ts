import type { ActiveTrack } from '@/lib/profile-store';
import type { TripStop, TransitSearchResult } from '@/lib/types';

export type TrackPhase = 'waiting' | 'active' | 'completed' | 'unknown';

export interface BusTrackStatus {
  phase: TrackPhase;
  statusLabel: string;
  countdown: string;
  progress: number;
  currentStop: TripStop | null;
  nextStop: TripStop | null;
  timeToNextStopMin: number;
}

export function isTrackExpired(track: ActiveTrack, now = Date.now()): boolean {
  return track.expiresAt <= now;
}

export function timeStringToMinutes(time: string): number {
  const normalized = time.replace('h', ':');
  const [h, m] = normalized.split(':').map((x) => parseInt(x, 10));
  if (!Number.isFinite(h)) {
    return 0;
  }
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

function formatMinutes(minutes: number, mode: 'departure' | 'arrival' = 'arrival'): string {
  if (minutes <= 0) {
    return mode === 'departure' ? 'Departing now' : 'Arriving now';
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function segmentStops(track: ActiveTrack): { name: string; time: string; timeInMinutes: number }[] {
  return track.stops
    .map((stop) => ({
      name: stop.name,
      time: stop.time,
      timeInMinutes: timeStringToMinutes(stop.time),
    }))
    .sort((a, b) => a.timeInMinutes - b.timeInMinutes);
}

export function computeBusStatus(track: ActiveTrack, now = new Date()): BusTrackStatus {
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const routeStops = segmentStops(track);
  if (routeStops.length === 0) {
    return {
      phase: 'unknown',
      statusLabel: 'Tracking',
      countdown: track.nextDeparture,
      progress: 0,
      currentStop: null,
      nextStop: null,
      timeToNextStopMin: 0,
    };
  }

  const first = routeStops[0];
  const last = routeStops[routeStops.length - 1];

  if (currentTime < first.timeInMinutes) {
    const minutesUntilStart = first.timeInMinutes - currentTime;
    return {
      phase: 'waiting',
      statusLabel: 'Waiting to start',
      countdown: formatMinutes(minutesUntilStart, 'departure'),
      progress: 0,
      currentStop: null,
      nextStop: { name: first.name, time: first.time },
      timeToNextStopMin: minutesUntilStart,
    };
  }

  if (currentTime > last.timeInMinutes) {
    return {
      phase: 'completed',
      statusLabel: 'Route completed',
      countdown: 'Finished',
      progress: 100,
      currentStop: { name: last.name, time: last.time },
      nextStop: null,
      timeToNextStopMin: 0,
    };
  }

  let currentIndex = 0;
  let nextIndex = 1;
  for (let i = 0; i < routeStops.length - 1; i++) {
    const a = routeStops[i].timeInMinutes;
    const b = routeStops[i + 1].timeInMinutes;
    if (currentTime >= a && currentTime < b) {
      currentIndex = i;
      nextIndex = i + 1;
      break;
    }
  }

  if (currentTime >= last.timeInMinutes) {
    currentIndex = routeStops.length - 1;
    nextIndex = routeStops.length - 1;
  }

  const current = routeStops[currentIndex];
  const next = nextIndex < routeStops.length ? routeStops[nextIndex] : null;
  const timeToNext = next ? Math.max(0, next.timeInMinutes - currentTime) : 0;
  const total = last.timeInMinutes - first.timeInMinutes;
  const elapsed = currentTime - first.timeInMinutes;
  const progress = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 0;

  let statusLabel = 'En route';
  if (timeToNext <= 2) {
    statusLabel = 'Arriving soon';
  } else if (timeToNext <= 5) {
    statusLabel = 'Approaching';
  }

  return {
    phase: 'active',
    statusLabel,
    countdown: formatMinutes(Math.max(0, last.timeInMinutes - currentTime)),
    progress,
    currentStop: { name: current.name, time: current.time },
    nextStop: next ? { name: next.name, time: next.time } : null,
    timeToNextStopMin: timeToNext,
  };
}

export function buildActiveTrackFromTrip(
  trip: TransitSearchResult,
  searchDay: string,
): Omit<ActiveTrack, 'id' | 'createdAt' | 'expiresAt'> {
  const today = new Date().toISOString().slice(0, 10);
  const stops = trip.stops?.length
    ? trip.stops
    : [
        { name: trip.origin, time: trip.start },
        { name: trip.destination, time: trip.end },
      ];
  return {
    tripId: trip.id,
    routeNumber: trip.route,
    origin: trip.origin,
    destination: trip.destination,
    searchDay,
    searchDate: today,
    stops,
    nextDeparture: trip.start,
    estimatedArrival: trip.end,
  };
}

export const MAX_ACTIVE_TRACKS = 5;
export const ACTIVE_TRACK_TTL_MS = 4 * 60 * 60 * 1000;
