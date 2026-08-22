/**
 * Transient notification UI state — the things the app needs to SAY, as opposed
 * to the things it needs to remember.
 *
 * Not persisted, and deliberately not part of `lib/notification-prefs-store.ts`.
 * Everything here is true for a moment: the rider just declined a prompt, an arm
 * just completed on return from Settings, permission has just been noticed
 * missing. Persisting any of it would resurrect a stale message on a launch days
 * later, which is worse than losing it.
 *
 * It exists as a store rather than a module variable because three unrelated
 * places produce these signals — the bell, the launch/foreground resume, and the
 * revocation check — and a card somewhere else has to re-render when they do.
 */

import { create } from 'zustand';

import type { ServiceAnnouncement } from '@/lib/notifications/types';

interface NotificationUiState {
  /**
   * The track whose arm was completed by the return-from-Settings resume.
   * Shown once as a confirmation, then cleared (05 §3.3 step 3).
   */
  resumedTrackId: string | null;
  /**
   * The track whose arm was refused because the rider declined the OS prompt.
   *
   * A quiet inline line, no sheet and no modal: they have just answered the
   * question and must not be nagged or pushed to Settings (05 §3.1).
   */
  deniedTrackId: string | null;
  /**
   * Permission was found missing while tracks are still armed (05 §3.4).
   *
   * The alarms are NOT cancelled — re-granting restores delivery for anything
   * still pending, and throwing away the rider's setup over a toggle they may
   * flip back in ten seconds would be its own bug.
   */
  permissionRevoked: boolean;
  /**
   * An announcement that is due but blocked only by permission (01 §4.1).
   *
   * Lives here rather than in the hook's own state because the SWEEP runs in the
   * app shell — so it happens on every launch and foreground, whatever tab the
   * rider is on — while the ROW that offers permission belongs on the transit
   * screen, under the banner explaining the same change. Two places, one fact.
   */
  announcementPrompt: ServiceAnnouncement | null;

  setAnnouncementPrompt: (announcement: ServiceAnnouncement | null) => void;
  markResumed: (trackId: string) => void;
  markDenied: (trackId: string) => void;
  clearNotice: () => void;
  setPermissionRevoked: (revoked: boolean) => void;
}

export const useNotificationUiStore = create<NotificationUiState>()((set) => ({
  resumedTrackId: null,
  deniedTrackId: null,
  permissionRevoked: false,
  announcementPrompt: null,

  setAnnouncementPrompt: (announcementPrompt) => set({ announcementPrompt }),

  // Only ever one notice at a time: the newest answers the rider's most recent
  // action, and stacking two would say "alerts are off" beside "alerts are on".
  markResumed: (trackId) => set({ resumedTrackId: trackId, deniedTrackId: null }),
  markDenied: (trackId) => set({ deniedTrackId: trackId, resumedTrackId: null }),
  clearNotice: () => set({ resumedTrackId: null, deniedTrackId: null }),
  setPermissionRevoked: (permissionRevoked) => set({ permissionRevoked }),
}));
