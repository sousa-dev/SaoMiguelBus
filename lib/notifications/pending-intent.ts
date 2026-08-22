/**
 * What the rider was in the middle of when we sent them to system Settings.
 *
 * **Without this the whole recovery path reads as broken**, and it is the step
 * most often skipped: the rider taps *Open Settings*, grants permission, comes
 * back — and finds the bell still empty with no sign anything happened. They
 * then have to remember what they were doing and repeat the entire flow. The
 * sheet copy explicitly promises "we'll set up your alerts when you come back",
 * so not finishing the job would make the app a liar as well as annoying.
 *
 * **In memory only, deliberately** (05 §3.3). This is a resumption hint, not
 * state worth persisting: if the OS kills the app while the rider is in
 * Settings, the right outcome is that they simply tap the bell again — not that
 * an arm they may have abandoned days ago fires on some later launch. A
 * module-level variable is exactly as durable as the intent deserves to be.
 */

import type { NotificationPrefs } from '@/lib/notifications/types';

export type PendingIntent =
  | { kind: 'armTrack'; trackId: string; prefs: NotificationPrefs }
  | { kind: 'announcement'; announcementId: string };

let pending: PendingIntent | null = null;

export function setPendingIntent(intent: PendingIntent | null): void {
  pending = intent;
}

/**
 * Read and clear in one step.
 *
 * Consuming on read is what stops a rider who returned without granting from
 * having the arm silently complete on some later foreground — they looked and
 * chose not to, and re-offering would be nagging (05 §3.3 step 4).
 */
export function takePendingIntent(): PendingIntent | null {
  const intent = pending;
  pending = null;
  return intent;
}

export function hasPendingIntent(): boolean {
  return pending !== null;
}
