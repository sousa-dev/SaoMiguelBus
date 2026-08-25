/**
 * Where a tapped notification lands.
 *
 * Both paths are handled, because they are genuinely different mechanisms and
 * only one of them is obvious (05 §6):
 *
 *  - **Warm tap** — the app is running or backgrounded. Arrives through the
 *    response listener.
 *  - **Cold-start tap** — the tap LAUNCHED the app from terminated. It is
 *    already waiting in `getLastNotificationResponseAsync()` before any listener
 *    could have been registered, so an implementation that only listens loses
 *    exactly the tap that mattered most: the one where the rider was not in the
 *    app to begin with.
 *
 * **Navigation waits for the router.** Routing during the splash silently drops
 * — the navigator is not mounted, `push` goes nowhere, and the rider lands on
 * the default tab wondering what their notification was about.
 * `useRootNavigationState()` is undefined until the tree is ready, so the tap is
 * held until it is not.
 *
 * Every notification this feature schedules carries `data.route`, so a future
 * deep link to a specific tracked journey needs no change to the payload — only
 * to what this does with it. `destinationFor` is that seam.
 *
 * **Where each notification lands, and why it is the same place:**
 *
 * | Notification | Destination | Reason |
 * |---|---|---|
 * | leaveNow / change / alight / complete | transit index | `ActiveTrackingSection` sits at the TOP of that screen showing the live countdown, the rider's position and which bus to catch — for this exact journey. A line timetable would be a deep link *away* from the thing the alarm is about |
 * | announcement | transit index | `ScheduleChangeBanner` is rendered there and carries the full explanation |
 * | test | transit index | a preview should land where the real one does |
 *
 * A stop-level deep link is deliberately not offered: `stop/[stopId]` needs a
 * NUMERIC stop id, and this feature transmits stop NAMES only. Adding ids to the
 * payload would mean putting more of the rider's itinerary into a notification
 * than it needs (08 §3), to land them on a page with less information than the
 * tracking widget they already get.
 */

import { usePathname, useRootNavigationState, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { logger } from '@/lib/logger';
import {
  trackAnnouncementOpened,
  trackNotificationOpened,
} from '@/lib/notifications/analytics';
import {
  addNotificationTapListener,
  clearInitialNotificationTap,
  getInitialNotificationTap,
  type NotificationTap,
} from '@/lib/notifications/scheduler';

/** The fallback when a payload carries no usable route of its own. */
const TRANSIT_INDEX = '/(tabs)/transit';

/**
 * An href as `usePathname()` will report it.
 *
 * Expo Router strips group segments from the URL, so the href
 * `/(tabs)/transit` is the pathname `/transit`. Comparing the two without
 * this returns false every time, and the hook navigates to a screen the rider
 * is already looking at.
 */
function asPathname(href: string): string {
  return href.replace(/\/\([^)]*\)/g, '') || '/';
}

/**
 * Where a tap should land. Kept as a function rather than reading
 * `tap.route` blindly, so adding a per-type destination later is a change here
 * and nowhere else — and so a payload written by an older build, or one whose
 * route no longer exists, still lands somewhere sensible.
 */
function destinationFor(tap: NotificationTap): Href {
  const route = tap.route?.trim();
  const href = route && route.startsWith('/') ? route : TRANSIT_INDEX;
  // Typed routes make `Href` a closed union, but this value arrives from a
  // notification payload that an older build may have written — so it is checked
  // for shape above and asserted here rather than assumed.
  return href as Href;
}

export function useNotificationTapRouting() {
  const router = useRouter();
  const pathname = usePathname();
  const navigationState = useRootNavigationState();
  const routerReady = Boolean(navigationState?.key);
  const [queued, setQueued] = useState<NotificationTap | null>(null);
  // Cold start is read once per process, not once per mount.
  const readInitial = useRef(false);

  const enqueue = useCallback((tap: NotificationTap) => {
    if (tap.kind === 'announcement' && tap.announcementId) {
      trackAnnouncementOpened(tap.announcementId);
    } else if (tap.kind === 'journey') {
      // A LOWER BOUND on delivery, never a delivery rate: a local notification
      // reports no receipt, so this counts taps and nothing more (08 §2).
      trackNotificationOpened(
        tap.type ?? 'unknown',
        tap.scheduledFor ? Math.round((Date.now() - tap.scheduledFor) / 60_000) : undefined,
      );
    }
    setQueued(tap);
  }, []);

  useEffect(() => {
    if (readInitial.current) {
      return;
    }
    readInitial.current = true;
    void getInitialNotificationTap()
      .then((tap) => {
        if (tap) {
          enqueue(tap);
        }
      })
      .catch((error) => logger.warn(`cold-start notification read failed: ${String(error)}`));
  }, [enqueue]);

  useEffect(() => {
    const subscription = addNotificationTapListener(enqueue);
    return () => subscription.remove();
  }, [enqueue]);

  useEffect(() => {
    if (!queued || !routerReady) {
      return;
    }
    setQueued(null);
    try {
      const href = destinationFor(queued);

      // Close anything presented OVER the tabs first — settings and profile are
      // `formSheet`/`modal` on the root stack, so without this the rider is
      // navigated underneath the sheet they were already looking at.
      if (router.canDismiss()) {
        router.dismissAll();
      }

      // Already there? Then dismissing was the whole job. Navigating anyway is
      // what put a second copy of the screen on screen.
      if (asPathname(href as string) === pathname) {
        void clearInitialNotificationTap();
        return;
      }

      // `replace`, never `push`. `push` appends a NEW entry to the ROOT stack —
      // and `(tabs)` is a root-stack screen sitting beside `settings` and
      // `profile`, which are `formSheet`/`modal` — so pushing stacked a second
      // copy of the entire tab navigator over the first and rendered it as a
      // card. `replace` swaps the current screen instead of adding one, so it
      // cannot stack; it is also what `[tripId].tsx` and `onboarding/personalize`
      // already use to reach this same tab.
      router.replace(href);
    } catch (error) {
      // A route that no longer exists must not take the app down on launch.
      logger.warn(`could not route notification tap to ${queued.route}: ${String(error)}`);
    }
    // Cleared only after it has been acted on, so the same response does not
    // re-navigate on every later remount.
    void clearInitialNotificationTap();
  }, [queued, routerReady, router, pathname]);
}
