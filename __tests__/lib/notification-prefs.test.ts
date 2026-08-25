/**
 * The pure half of the preferences store.
 *
 * `lib/notification-prefs-store.ts` itself imports AsyncStorage and so cannot be
 * loaded by this runner at all — which is exactly why the shapes and the merge
 * live in `lib/notifications/types.ts` and the store only re-exports them.
 *
 * The case that matters here is the upgrade path. `serviceAnnouncements` and
 * `notifyPinnedRoutes` are booleans added after the first shape existed, and a
 * blob written without them reads `undefined` — which is falsy. Reading that
 * naively would switch service announcements OFF for every rider who upgraded,
 * silently, and the free timetable-change warning is the one thing in this
 * feature that has a public-safety justification.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  defaultNotificationPrefs,
  mergeNotificationPrefs,
  LEAD_MINUTE_OPTIONS,
} from '@/lib/notifications/types';

describe('defaultNotificationPrefs', () => {
  it('ships the documented defaults (03 §2)', () => {
    assert.deepEqual(defaultNotificationPrefs(), {
      leaveNow: { enabled: true, leadMinutes: 10 },
      change: { enabled: true, leadMinutes: 5 },
      alight: { enabled: true, leadMinutes: 0 },
      complete: { enabled: false, leadMinutes: 0 },
      notifyPinnedRoutes: false,
      serviceAnnouncements: true,
    });
  });

  it('defaults `complete` off and service announcements on', () => {
    const prefs = defaultNotificationPrefs();
    assert.equal(prefs.complete.enabled, false, 'a rider at their destination rarely needs telling');
    assert.equal(prefs.serviceAnnouncements, true, 'the free channel is opt-OUT, not opt-in');
    assert.equal(prefs.notifyPinnedRoutes, false, 'the auto-track sweep never notifies by default');
  });

  it('hands out an independent copy each time', () => {
    const a = defaultNotificationPrefs();
    const b = defaultNotificationPrefs();
    a.leaveNow.leadMinutes = 99;
    a.serviceAnnouncements = false;
    assert.equal(b.leaveNow.leadMinutes, 10, 'mutating one copy must not rewrite the defaults');
    assert.equal(b.serviceAnnouncements, true);
  });

  it('offers lead times that include the shipped default', () => {
    assert.ok(LEAD_MINUTE_OPTIONS.includes(defaultNotificationPrefs().leaveNow.leadMinutes));
    assert.ok(LEAD_MINUTE_OPTIONS.includes(defaultNotificationPrefs().change.leadMinutes));
  });
});

describe('mergeNotificationPrefs', () => {
  it('returns the defaults for a device that has never stored anything', () => {
    assert.deepEqual(mergeNotificationPrefs(null), defaultNotificationPrefs());
    assert.deepEqual(mergeNotificationPrefs(undefined), defaultNotificationPrefs());
    assert.deepEqual(mergeNotificationPrefs({}), defaultNotificationPrefs());
  });

  it('keeps service announcements ON when an older blob never stored the field', () => {
    const legacy = {
      leaveNow: { enabled: true, leadMinutes: 15 },
      change: { enabled: false, leadMinutes: 5 },
      alight: { enabled: true, leadMinutes: 0 },
      complete: { enabled: false, leadMinutes: 0 },
    };
    const merged = mergeNotificationPrefs(legacy);
    assert.equal(merged.serviceAnnouncements, true, 'absent must not read as off');
    assert.equal(merged.notifyPinnedRoutes, false);
  });

  it('preserves what the rider actually chose', () => {
    const merged = mergeNotificationPrefs({
      leaveNow: { enabled: false, leadMinutes: 30 },
      complete: { enabled: true, leadMinutes: 0 },
      serviceAnnouncements: false,
    });
    assert.equal(merged.leaveNow.enabled, false);
    assert.equal(merged.leaveNow.leadMinutes, 30);
    assert.equal(merged.complete.enabled, true);
    assert.equal(merged.serviceAnnouncements, false, 'an explicit opt-out survives the merge');
  });

  it('fills a half-written alarm entry from the default rather than producing NaN', () => {
    const merged = mergeNotificationPrefs({
      leaveNow: { enabled: false } as { enabled: boolean; leadMinutes: number },
    });
    assert.equal(merged.leaveNow.enabled, false);
    assert.equal(merged.leaveNow.leadMinutes, 10, 'the missing lead falls back to the default');
  });

  it('does not alias the defaults into the merged result', () => {
    const merged = mergeNotificationPrefs({});
    merged.alight.enabled = false;
    assert.equal(defaultNotificationPrefs().alight.enabled, true);
  });
});
