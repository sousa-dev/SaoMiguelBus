/**
 * The one native surface both platforms sit behind.
 *
 * Mirrors the shape and the caution of `lib/notifications/exact-alarms.ts`:
 * `requireOptionalNativeModule` rather than `requireNativeModule`, because
 * this module is absent from any build that has not been prebuilt against it
 * (Expo Go, web, or an iOS binary built before the Swift half lands), and a
 * missing native module must degrade to "unsupported" rather than crashing at
 * import time.
 *
 * Every export below is a no-op when the module is absent. Callers never
 * branch on `Platform.OS` or on whether the module loaded — they call these
 * functions and read the returned capability/backend instead.
 */
import { requireOptionalNativeModule } from 'expo';
import type { EventSubscription } from 'expo-modules-core';
import { Platform } from 'react-native';

import { logger } from '@/lib/logger';
import type {
  LiveTripBackend,
  LiveTripCapability,
  LiveTripDescriptor,
  LiveTripListEntry,
  LiveTripSnapshot,
  LiveTripStartResult,
  LiveTripStrings,
} from './types';

interface LiveTripNativeModule {
  start: (config: Record<string, unknown>) => Promise<LiveTripStartResult>;
  update: (activityKey: string, snapshot: LiveTripSnapshot) => Promise<void>;
  updateStrings: (activityKey: string, strings: LiveTripStrings) => Promise<void>;
  stop: () => Promise<void>;
  listLiveTrips: () => Promise<LiveTripListEntry[]>;
  isRunning: () => boolean;
  addListener: (
    event: 'onPushToken' | 'onStateChange',
    listener: (payload: Record<string, unknown>) => void,
  ) => EventSubscription;
}

const native = requireOptionalNativeModule<LiveTripNativeModule>('LiveTrip');

function backendForPlatform(): LiveTripBackend {
  if (Platform.OS === 'android') {
    return 'androidForegroundService';
  }
  if (Platform.OS === 'ios') {
    return 'iosLiveActivity';
  }
  return 'none';
}

export function liveTripBackend(): LiveTripBackend {
  return native ? backendForPlatform() : 'none';
}

export async function liveTripCapability(): Promise<LiveTripCapability> {
  if (!native || liveTripBackend() === 'none') {
    return 'unsupported';
  }
  // Permission/system-setting checks are cheap and platform-specific; for now
  // this reports optimistically and lets `start()` report the real refusal —
  // Task 6 (iOS) is expected to extend this with `areActivitiesEnabled`.
  return 'available';
}

function toNativeConfig(
  descriptor: LiveTripDescriptor,
  strings: LiveTripStrings,
): Record<string, unknown> {
  return {
    activityKey: descriptor.activityKey,
    apiBase: descriptor.apiBase,
    islandKey: descriptor.islandKey,
    sessionId: descriptor.sessionId,
    legs: descriptor.legs,
    departureDayStartMs: descriptor.departureDayStartMs,
    endsAtEpochMs: descriptor.endsAtEpochMs,
    deepLink: descriptor.deepLink,
    route: descriptor.route,
    destination: descriptor.destination,
    eta: descriptor.eta,
    intervalMs: descriptor.intervalMs,
    strings,
  };
}

export async function startLiveTrip(
  descriptor: LiveTripDescriptor,
  strings: LiveTripStrings,
  _snapshot: LiveTripSnapshot,
): Promise<LiveTripStartResult> {
  if (!native) {
    return { started: false, backend: 'none' };
  }
  try {
    return await native.start(toNativeConfig(descriptor, strings));
  } catch (error) {
    logger.warn(`live-trip start failed: ${String(error)}`);
    return { started: false, backend: 'none' };
  }
}

/**
 * The in-app update path, used on both platforms for the instant the app is
 * open: Android's service will overwrite this on its next poll regardless (it
 * is the source of truth), so this is only an optimistic paint there. On iOS
 * this is the ONLY update path while foregrounded — a push is what covers the
 * rest of the trip.
 */
export async function updateLiveTrip(activityKey: string, snapshot: LiveTripSnapshot): Promise<void> {
  if (!native) {
    return;
  }
  try {
    await native.update(activityKey, snapshot);
  } catch (error) {
    logger.warn(`live-trip update failed: ${String(error)}`);
  }
}

/** A language change mid-trip. Rewrites the shared templates on iOS. */
export async function updateLiveTripStrings(
  activityKey: string,
  strings: LiveTripStrings,
): Promise<void> {
  if (!native) {
    return;
  }
  try {
    await native.updateStrings(activityKey, strings);
  } catch (error) {
    logger.warn(`live-trip updateStrings failed: ${String(error)}`);
  }
}

export async function stopLiveTrip(): Promise<void> {
  if (!native) {
    return;
  }
  try {
    await native.stop();
  } catch (error) {
    logger.warn(`live-trip stop failed: ${String(error)}`);
  }
}

/** Reconciliation on foreground: what does the OS still think is running? */
export async function listLiveTrips(): Promise<LiveTripListEntry[]> {
  if (!native) {
    return [];
  }
  try {
    return await native.listLiveTrips();
  } catch (error) {
    logger.warn(`live-trip listLiveTrips failed: ${String(error)}`);
    return [];
  }
}

/**
 * iOS-only in practice: Android has no push channel for this bar, so there is
 * nothing to rotate and no event ever fires there. Still safe to call
 * unconditionally — it degrades to an inert subscription rather than making
 * every caller check `Platform.OS` first.
 */
export function addLiveTripPushTokenListener(
  listener: (e: { activityKey: string; token: string }) => void,
): { remove: () => void } {
  if (!native || Platform.OS !== 'ios') {
    return { remove: () => {} };
  }
  try {
    const subscription = native.addListener('onPushToken', (payload) =>
      listener({
        activityKey: String(payload.activityKey ?? ''),
        token: String(payload.token ?? ''),
      }),
    );
    return { remove: () => subscription.remove() };
  } catch (error) {
    logger.warn(`could not observe live-trip push tokens: ${String(error)}`);
    return { remove: () => {} };
  }
}

/**
 * A card the rider dismissed themselves, or one the OS ended on its own.
 * iOS-only in practice, for the same reason the push-token listener is.
 */
export function addLiveTripStateListener(
  listener: (e: { activityKey: string; state: string }) => void,
): { remove: () => void } {
  if (!native || Platform.OS !== 'ios') {
    return { remove: () => {} };
  }
  try {
    const subscription = native.addListener('onStateChange', (payload) =>
      listener({
        activityKey: String(payload.activityKey ?? ''),
        state: String(payload.state ?? ''),
      }),
    );
    return { remove: () => subscription.remove() };
  } catch (error) {
    logger.warn(`could not observe live-trip state: ${String(error)}`);
    return { remove: () => {} };
  }
}
