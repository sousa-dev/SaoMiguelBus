import type { LiveTripSnapshot, LiveTripStrings } from '@/features/transit/lib/live-trip-state';
import type { LiveTripLegWindow } from '@/features/transit/lib/live-trip-legs';

export type { LiveTripSnapshot, LiveTripStrings };

/**
 * Which mechanism is actually behind the bar. Named, not booleaned, so no
 * caller can pretend the two platforms are the same thing: the Android bar
 * keeps running with the app closed; the iOS bar only stays fresh once the
 * server successfully registers a push token for it.
 */
export type LiveTripBackend = 'androidForegroundService' | 'iosLiveActivity' | 'none';

export type LiveTripCapability =
  | 'available'
  | 'unsupported' // web, iOS before the Live Activity module lands, module absent from this binary
  | 'needsPermission' // Android: POST_NOTIFICATIONS denied
  | 'disabledBySystem'; // iOS: the rider has Live Activities switched off in Settings

/** Immutable for the life of one bar. `activityKey` is `ActiveTrack.id`. */
export interface LiveTripDescriptor {
  activityKey: string;
  apiBase: string;
  islandKey: string;
  sessionId: string;
  legs: LiveTripLegWindow[];
  /** Epoch ms for the itinerary's departure-day midnight. */
  departureDayStartMs: number;
  /** Hard stop; native self-terminates here even if JS never calls stop. */
  endsAtEpochMs: number;
  deepLink: string;
  route: string;
  destination: string;
  /** Scheduled arrival wall clock, e.g. "21h59". */
  eta: string;
  intervalMs: number;
}

export interface LiveTripStartResult {
  started: boolean;
  backend: LiveTripBackend;
}

export interface LiveTripListEntry {
  activityKey: string;
  pushToken: string | null;
}
