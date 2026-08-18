/**
 * Pinned routes that start following themselves when their time comes.
 *
 * Both apps already promise this and neither kept it: the webapp's pin dialog
 * says "this route will be automatically tracked on all days it operates" and
 * stores an `autoTrackTime` nothing ever reads, and the mobile catalogue carries
 * the matching `autoTracking*` strings with no code behind them. A pin whose
 * whole point is "I take this every morning" should not need a tap every morning.
 *
 * Runs on launch and whenever the app returns to the foreground — the two moments
 * a rider is actually looking at it. There is no background execution and no
 * push notification anywhere in this feature, so a sweep on a timer while the app
 * is closed is not something this can honestly offer.
 *
 * Cost is kept to almost nothing by asking the pins themselves first: a pin only
 * ever matches a run leaving at the time it stores, so `pinsDueNow` rules out
 * every pin whose hour has not come without touching the network. Only what
 * survives that is confirmed against the real timetable.
 *
 * Deliberately silent. An automatic action that opens a dialog is worse than one
 * that does nothing — failures are logged and the widget simply stays as it was.
 */

import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { useBootstrap } from '@/features/transit/hooks/useBootstrapQueries';
import {
  FULL_DAY_START,
  fetchJourneySearch,
  journeySearchQueryKey,
  type JourneySearchParams,
} from '@/features/transit/hooks/useOfflineSearch';
import { useScheduleConfig, useTransitDataset } from '@/features/transit/hooks/useScheduleConfig';
import { journeyTrackPayload } from '@/features/transit/lib/journey-legs';
import {
  AUTO_TRACK_SLOT_RESERVE,
  pinsDueNow,
  planAutoTracks,
} from '@/features/transit/lib/pinned-follow';
import { MAX_ACTIVE_TRACKS, localIsoDate } from '@/lib/bus-tracking';
import { logger } from '@/lib/logger';
import { useNetwork } from '@/lib/network-provider';
import { usePremium } from '@/lib/premium-store';
import { useProfileStore, type PinnedRoute } from '@/lib/profile-store';
import { displayRouteNumber, resolveDayType } from '@/lib/transit-format';
import type { TransitJourney } from '@/lib/types';

/** Pins can hold a change of bus, so the search has to allow one. */
const AUTO_TRACK_MAX_TRANSFERS = 1;

/**
 * Floor between sweeps. Toggling in and out of the app repeatedly should not
 * re-run the search each time; nothing in a 45-minute window changes in seconds.
 */
const MIN_SWEEP_INTERVAL_MS = 60_000;

export function useAutoTrackPinnedRoutes() {
  const isPremium = usePremium();
  // A countdown must not run against a timetable that is not in force — the same
  // gate the manual action stands down for.
  const { canTrackTrips } = useScheduleConfig();
  const dataset = useTransitDataset();
  const { isOnline } = useNetwork();
  const bootstrap = useBootstrap();
  const queryClient = useQueryClient();
  // The raw store actions, not `useBusTracking`: that hook runs a 30-second tick
  // to refresh countdowns, and this is mounted at the app shell, where a tick
  // would re-render the whole navigator twice a minute for nothing.
  const startTracking = useProfileStore((s) => s.startTracking);
  const markAutoTracked = useProfileStore((s) => s.markAutoTracked);

  const running = useRef(false);
  const lastSweepAt = useRef(0);
  // Read through a ref so a late-arriving holiday list does not rebuild `sweep`
  // and re-fire the launch effect.
  const holidaysRef = useRef(bootstrap.data?.holidays);
  holidaysRef.current = bootstrap.data?.holidays;

  const sweep = useCallback(async () => {
    if (!isPremium || !canTrackTrips || running.current) {
      return;
    }
    const startedAt = Date.now();
    if (startedAt - lastSweepAt.current < MIN_SWEEP_INTERVAL_MS) {
      return;
    }

    const { tracking } = useProfileStore.getState();
    const now = new Date();
    const today = localIsoDate(now);
    const armed = tracking.autoTracked ?? {};
    const alreadyArmed = (pin: PinnedRoute) => armed[`${pin.id}|${today}`] != null;

    // One slot is held back so a rider is never refused a manual track because
    // the sweep spent every one.
    const slots = MAX_ACTIVE_TRACKS - AUTO_TRACK_SLOT_RESERVE - tracking.active.length;
    if (slots <= 0) {
      return;
    }

    const due = pinsDueNow(tracking.pinned, today, now, { alreadyArmed });
    if (due.length === 0) {
      return;
    }

    running.current = true;
    lastSweepAt.current = startedAt;
    try {
      const dayType = resolveDayType(now, holidaysRef.current);

      // Pins sharing an origin and destination share one request. The endpoints
      // are carried alongside the key rather than parsed back out of it: stop
      // names hold spaces, commas and dashes, so no separator is safe to split on.
      const pairKey = (pin: PinnedRoute) => `${pin.origin} -> ${pin.destination}`;
      const pairs = new Map<string, { origin: string; destination: string }>();
      for (const pin of due) {
        pairs.set(pairKey(pin), { origin: pin.origin, destination: pin.destination });
      }

      const answers = new Map<string, TransitJourney[]>();
      await Promise.all(
        [...pairs].map(async ([key, pair]) => {
          const params: JourneySearchParams = {
            origin: pair.origin,
            destination: pair.destination,
            day: dayType,
            start: FULL_DAY_START,
            isoDate: today,
            maxTransfers: AUTO_TRACK_MAX_TRANSFERS,
            dataset,
            isOnline,
          };
          const result = await queryClient.fetchQuery({
            queryKey: journeySearchQueryKey(params),
            queryFn: () => fetchJourneySearch({ ...params, source: 'auto_track' }),
          });
          answers.set(key, result.journeys);
        }),
      );

      const plan = planAutoTracks({
        pins: due,
        journeysFor: (pin) => answers.get(pairKey(pin)) ?? [],
        today,
        dayType,
        now,
        slots,
        alreadyArmed,
      });

      for (const { pin, journey } of plan) {
        startTracking(
          journeyTrackPayload(journey, dayType, dataset, displayRouteNumber, { auto: true }),
        );
        // Marked whatever the store answered. A duplicate or a full list is not
        // a reason to try again on the next foreground, and re-arming a track
        // the rider has just dismissed is the failure this guards against.
        markAutoTracked(pin.id, today);
      }
    } catch (error) {
      logger.warn(`auto-tracking pinned routes failed: ${String(error)}`);
    } finally {
      running.current = false;
    }
    // Every dependency here is a stable value or a stable store action, so
    // `sweep` keeps its identity and the effects below fire only when they mean
    // something: launch, bootstrap resolving, and a return to the foreground.
  }, [isPremium, canTrackTrips, dataset, isOnline, queryClient, startTracking, markAutoTracked]);

  // Launch. Bootstrap decides the day type and the dataset, so a sweep before it
  // lands would search the wrong network — this re-runs when it resolves.
  useEffect(() => {
    void sweep();
  }, [sweep, bootstrap.isSuccess]);

  // Foreground. The common way this app is opened is a resume, not a cold start.
  useEffect(() => {
    const previous = { state: AppState.currentState };
    const onChange = (next: AppStateStatus) => {
      const wasBackground = previous.state !== 'active';
      previous.state = next;
      if (next === 'active' && wasBackground) {
        void sweep();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [sweep]);
}
