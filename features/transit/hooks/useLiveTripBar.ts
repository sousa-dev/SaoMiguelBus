/**
 * Binds the rider's tracked journeys to the native live-trip bar.
 *
 * Thin by design — `lib/live-trip/plan.ts` decides whether a track is a live-
 * bar candidate, `lib/live-trip/controller.ts` talks to native. This hook only
 * decides WHICH track wins when several are active, WHEN to re-check (mount,
 * tracked-set change, every foreground — the OS may have torn the bar down
 * independently of anything JS did), and — iOS only — keeps the server's
 * push-token registration in step with whichever activity is actually running.
 *
 * One bar, not five: the first active, non-expired, AzoresBus track whose
 * window is current wins. `ensurePermission('arm')` is the same gate arming a
 * scheduled alarm already goes through — if it is refused, this does nothing
 * and does not nag; the in-app tracked-journey widget still works without it.
 */
import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useTranslation } from 'react-i18next';

import { staticIslandConfig } from '@/config/island';
import { useBusTracking } from '@/features/transit/hooks/useBusTracking';
import { liveTripStrings } from '@/features/transit/lib/live-trip-state';
import { getApiBase, registerLiveActivity, unregisterLiveActivity } from '@/lib/api';
import { startLiveTripBar, stopLiveTripBar } from '@/lib/live-trip/controller';
import { addLiveTripPushTokenListener, listLiveTrips } from '@/lib/live-trip/native';
import type { LiveTripDescriptor } from '@/lib/live-trip/types';
import { logger } from '@/lib/logger';
import { ensurePermission } from '@/lib/notifications/scheduler';
import { usePremium } from '@/lib/premium-store';
import { getOrCreateSessionId } from '@/lib/session';

/**
 * Which APNs environment a push token was minted under is fixed by how the
 * binary itself was signed, not by anything the app decides at runtime — a
 * token from one environment is rejected outright by the other. `__DEV__` is
 * the standard proxy for that split in Expo/RN: true only for a
 * Metro-connected dev-client/Expo Go session (sandbox APNs), false for every
 * packaged build including TestFlight and the App Store (production APNs,
 * per Apple's own environment rules). Verify this holds on a real TestFlight
 * build in plan Task 9 Step 3 — it is the single most likely reason a Live
 * Activity would render once and never update again.
 */
function apnsEnvironment(): 'development' | 'production' {
  return __DEV__ ? 'development' : 'production';
}

function registrationBody(
  descriptor: LiveTripDescriptor,
  pushToken: string,
): Parameters<typeof registerLiveActivity>[0] {
  return {
    pushToken,
    environment: apnsEnvironment(),
    activityKey: descriptor.activityKey,
    legs: descriptor.legs.map((leg) => ({
      tripId: leg.tripId,
      startsAt: new Date(descriptor.departureDayStartMs + leg.startMinutes * 60_000).toISOString(),
      endsAt: new Date(descriptor.departureDayStartMs + leg.endMinutes * 60_000).toISOString(),
    })),
    expiresAt: new Date(descriptor.endsAtEpochMs).toISOString(),
  };
}

export function useLiveTripBar(): void {
  const isPremium = usePremium();
  const { active } = useBusTracking();
  const { t, i18n } = useTranslation();
  const runningTrackIdRef = useRef<string | null>(null);
  const runningDescriptorRef = useRef<LiveTripDescriptor | null>(null);
  const lastPushTokenRef = useRef<string | null>(null);

  const stop = useCallback(async () => {
    await stopLiveTripBar();
    if (lastPushTokenRef.current) {
      await unregisterLiveActivity(lastPushTokenRef.current);
    }
    runningTrackIdRef.current = null;
    runningDescriptorRef.current = null;
    lastPushTokenRef.current = null;
  }, []);

  const sync = useCallback(async () => {
    if (!isPremium || active.length === 0) {
      if (runningTrackIdRef.current) {
        await stop();
      }
      return;
    }

    const now = new Date();
    const strings = liveTripStrings(t, i18n.language);
    const apiBase = getApiBase();
    const islandKey = staticIslandConfig.islandKey;
    const sessionId = await getOrCreateSessionId();

    for (const { track } of active) {
      if (runningTrackIdRef.current === track.id) {
        // Already the one running -- do not restart the service/activity on
        // every re-sync, which would reset its own timer for nothing.
        return;
      }
      const result = await startLiveTripBar(track, strings, apiBase, islandKey, sessionId, now);
      if (result?.started) {
        runningTrackIdRef.current = track.id;
        runningDescriptorRef.current = result.descriptor;
        return;
      }
    }

    // No active track is a live-bar candidate right now (none AzoresBus, none
    // with a usable tripId, or all already finished). If one was running for
    // a track no longer in `active` (stopped, expired), tear it down.
    if (runningTrackIdRef.current) {
      await stop();
    }
  }, [active, isPremium, t, i18n.language, stop]);

  useEffect(() => {
    void sync().catch((error) => logger.warn(`live-trip sync failed: ${String(error)}`));
  }, [sync]);

  // iOS only in practice: `addLiveTripPushTokenListener` is an inert
  // subscription everywhere else. Registers as soon as ActivityKit hands
  // back a token, and re-registers on every foreground for any activity the
  // server has not yet acknowledged -- APNs can rotate an activity's token
  // while the app is dead, when nothing else would ever notice.
  useEffect(() => {
    const subscription = addLiveTripPushTokenListener(({ activityKey, token }) => {
      if (runningDescriptorRef.current?.activityKey !== activityKey || !token) {
        return;
      }
      lastPushTokenRef.current = token;
      void registerLiveActivity(registrationBody(runningDescriptorRef.current, token)).catch(
        (error) => logger.warn(`live-trip push registration failed: ${String(error)}`),
      );
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const resync = async () => {
      await sync();
      const descriptor = runningDescriptorRef.current;
      if (!descriptor) {
        return;
      }
      const running = await listLiveTrips();
      const entry = running.find((r) => r.activityKey === descriptor.activityKey);
      if (entry?.pushToken) {
        lastPushTokenRef.current = entry.pushToken;
        await registerLiveActivity(registrationBody(descriptor, entry.pushToken));
      }
    };
    const onChange = (next: AppStateStatus) => {
      if (next === 'active') {
        void resync().catch((error) => logger.warn(`live-trip foreground sync failed: ${String(error)}`));
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [sync]);

  useEffect(() => {
    return () => {
      if (runningTrackIdRef.current) {
        void stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount only
  }, []);
}
