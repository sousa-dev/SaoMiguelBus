/**
 * Arms the free service-announcement channel.
 *
 * Runs on launch and on every return to the foreground — the same cadence
 * `useAutoTrackPinnedRoutes` established, and for the same reason: those are the
 * two moments a rider is actually looking at the app. It is cheap enough to run
 * unconditionally, because with nothing to announce it is a null check on a
 * cached object and never touches the OS.
 *
 * **The channel never triggers a cold OS prompt** (01 §4.1). A free rider has no
 * reason to have granted notification permission, and prompting at launch for
 * something they cannot yet see the value of is precisely the prompt people deny
 * permanently — and a denial is effectively irreversible. So it schedules only
 * when permission is *already* granted, and otherwise hands the caller a pending
 * announcement to offer in context, once, on a row that says what the
 * notification will be about.
 *
 * Reads `useScheduleConfig().config` rather than bootstrap directly, so the
 * *Simulate cutover* developer control in `app/settings.tsx` drives this exactly
 * as it drives the banner (09 §6). Moving the device clock deliberately does
 * nothing: the phase is server state, not something the client derives.
 *
 * **Mounted in the app shell, not on the transit screen** (01 §4, 05 §5.1). That
 * placement is the difference between "scheduled for everyone who opens the app"
 * and "scheduled only for people who happen to tap into the transit tab" — and
 * this is a nine-module hub, so plenty of riders open it for the weather and
 * never go near a timetable. The permission ROW it produces still belongs on the
 * transit screen, beside the banner about the same change, so the pending
 * announcement is published to `useNotificationUiStore` and rendered from there.
 */

import { useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useScheduleConfig } from '@/features/transit/hooks/useScheduleConfig';
import { logger } from '@/lib/logger';
import { useNotificationPrefsStore } from '@/lib/notification-prefs-store';
import {
  trackAnnouncementPromptShown,
  trackAnnouncementScheduled,
  trackAnnouncementSkipped,
} from '@/lib/notifications/analytics';
import {
  ANNOUNCE_HOUR_LOCAL,
  resolveAnnouncements,
} from '@/lib/notifications/announcements';
import { ensurePermission, permissionGate, scheduleAnnouncement } from '@/lib/notifications/scheduler';
import { useNotificationUiStore } from '@/lib/notifications/ui-store';

export function useServiceAnnouncements(): void {
  const { config } = useScheduleConfig();
  const optedIn = useNotificationPrefsStore((s) => s.defaults.serviceAnnouncements);
  const fired = useNotificationPrefsStore((s) => s.firedAnnouncements);
  const promptSeen = useNotificationPrefsStore((s) => s.announcementPromptSeen);
  const markFired = useNotificationPrefsStore((s) => s.markAnnouncementFired);
  const markPromptSeen = useNotificationPrefsStore((s) => s.markAnnouncementPromptSeen);

  const setPrompt = useNotificationUiStore((s) => s.setAnnouncementPrompt);

  const sweep = useCallback(async () => {
    // The ungated in-app opt-out App Store guideline 4.5.4 expects (11 §I1.2).
    // Checked first, so an opted-out rider costs nothing at all.
    if (!optedIn) {
      setPrompt(null);
      return;
    }

    const due = resolveAnnouncements(config, {
      now: Date.now(),
      announceHour: ANNOUNCE_HOUR_LOCAL,
    }).filter((announcement) => fired[announcement.id] == null);

    if (due.length === 0) {
      setPrompt(null);
      return;
    }

    if ((await permissionGate()) !== 'granted') {
      // Offered in context rather than prompted for. Asked at most once per
      // announcement — a rider who said "not now" is not asked again about the
      // same one.
      // The direct measure of the 1 September reach problem: devices that
      // WOULD have been warned and were not (10 §2).
      for (const announcement of due) {
        trackAnnouncementSkipped(announcement.id, 'no_permission');
      }
      const unasked = due.find((announcement) => !promptSeen[announcement.id]) ?? null;
      if (unasked) {
        trackAnnouncementPromptShown(unasked.id);
      }
      setPrompt(unasked);
      return;
    }

    setPrompt(null);
    for (const announcement of due) {
      const id = await scheduleAnnouncement(announcement);
      if (id) {
        trackAnnouncementScheduled(
          announcement.id,
          Math.round((announcement.fireAt.getTime() - Date.now()) / 3_600_000),
        );
        // Recorded at SCHEDULE time, not at delivery: a local notification
        // reports no delivery receipt, and recording "we scheduled it" as "they
        // got it" would be false (03 §5). What this prevents is scheduling the
        // same announcement twice, which is all it claims to prevent.
        markFired(announcement.id, Date.now());
      }
    }
  }, [config, optedIn, fired, promptSeen, markFired]);

  useEffect(() => {
    void sweep().catch((error) => logger.warn(`announcement sweep failed: ${String(error)}`));
  }, [sweep]);

  // Foreground. Also the resume path: a rider who granted permission in system
  // settings and came back gets the announcement scheduled here, immediately,
  // rather than waiting for the next launch (05 §3.3).
  useEffect(() => {
    const previous = { state: AppState.currentState };
    const onChange = (next: AppStateStatus) => {
      const wasBackground = previous.state !== 'active';
      previous.state = next;
      if (next === 'active' && wasBackground) {
        void sweep().catch((error) => logger.warn(`announcement sweep failed: ${String(error)}`));
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [sweep]);

}

/**
 * The rider tapped *Turn on* on the in-app row.
 *
 * This is the ONE place the free channel may ask for permission, and only
 * because they just pressed a button that says what it is for (01 §4.1).
 * Module-level rather than part of the hook, so the row on the transit screen
 * can call it while the sweep itself runs in the shell.
 */
export async function enableServiceAnnouncements(): Promise<void> {
  const ui = useNotificationUiStore.getState();
  const current = ui.announcementPrompt;
  if (!current) {
    return;
  }
  const prefs = useNotificationPrefsStore.getState();
  if ((await ensurePermission('announcement_row')) !== 'granted') {
    // Blocked or refused. Do not nag — `app/settings.tsx` carries the permanent,
    // discoverable route back (02 §4.4).
    prefs.markAnnouncementPromptSeen(current.id);
    ui.setAnnouncementPrompt(null);
    return;
  }
  const id = await scheduleAnnouncement(current);
  if (id) {
    trackAnnouncementScheduled(
      current.id,
      Math.round((current.fireAt.getTime() - Date.now()) / 3_600_000),
    );
    prefs.markAnnouncementFired(current.id, Date.now());
  }
  ui.setAnnouncementPrompt(null);
}

/** Remembered per announcement id, so it is offered at most once. */
export function dismissServiceAnnouncement(): void {
  const ui = useNotificationUiStore.getState();
  if (ui.announcementPrompt) {
    useNotificationPrefsStore.getState().markAnnouncementPromptSeen(ui.announcementPrompt.id);
  }
  ui.setAnnouncementPrompt(null);
}
