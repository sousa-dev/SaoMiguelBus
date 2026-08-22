/**
 * The free announcement channel (09 §3).
 *
 * Two of these tests exist because of specific bugs rather than for coverage,
 * and both would be invisible in production until the day they mattered:
 *
 *  1. **The dedupe key must not be `banner.id`.** The deployed configuration
 *     carries a `phases.preview` override that changes the resolved banner id at
 *     the exact instant the announcement is due, so keying on it would schedule
 *     the same announcement twice. The fixture below is the real production
 *     block, not an invented one.
 *  2. **The fire instant must be derived in LOCAL time.** A UTC-derived calendar
 *     date fires the 1 September announcement on 2 September for a large part of
 *     the world, including the Azores.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  ANNOUNCE_HOUR_LOCAL,
  announcementId,
  resolveAnnouncements,
} from '@/lib/notifications/announcements';
import type { SchedulePhase, TransitScheduleConfig } from '@/lib/types';

/**
 * The production `Island.feature_flags.azoresbus` block for `sao-miguel`, read
 * 2026-08-21. The `phases.preview` override on the banner is the whole point —
 * do not "tidy" it away.
 */
function productionConfig(phase: SchedulePhase): TransitScheduleConfig {
  return {
    activeDataset: 'azoresbus',
    previewDataset: 'azoresbus',
    cutoverAt: '2026-09-01T00:00:00+00:00',
    nextTransitionAt: '2026-10-01T00:00:00+00:00',
    phase,
    banner: {
      id: 'azoresbus-live-2026-09',
      tone: 'info',
      dismissible: true,
      text: { pt: 'Os novos horários já estão em vigor.' },
      phases: {
        preview: {
          id: 'azoresbus-preview-2026-08',
          text: { pt: 'Pré-visualize os novos horários.' },
        },
      },
    },
    badge: null,
    trackingEnabled: false,
  };
}

function config(overrides: Partial<TransitScheduleConfig>): TransitScheduleConfig {
  return { ...productionConfig('live'), ...overrides };
}

const OPTIONS = (now: Date) => ({ now: now.getTime(), announceHour: ANNOUNCE_HOUR_LOCAL });

describe('resolveAnnouncements — suppression', () => {
  it('resolves nothing when no cutover is armed', () => {
    assert.deepEqual(
      resolveAnnouncements(config({ cutoverAt: null }), OPTIONS(new Date(2026, 7, 20))),
      [],
    );
  });

  it('resolves nothing for a null config at all', () => {
    assert.deepEqual(resolveAnnouncements(null, OPTIONS(new Date(2026, 7, 20))), []);
    assert.deepEqual(resolveAnnouncements(undefined, OPTIONS(new Date(2026, 7, 20))), []);
  });

  it('resolves nothing once the phase is settled — the changeover is old news', () => {
    assert.deepEqual(
      resolveAnnouncements(productionConfig('settled'), OPTIONS(new Date(2026, 7, 20))),
      [],
    );
  });

  it('resolves nothing for a malformed cutover instant', () => {
    assert.deepEqual(
      resolveAnnouncements(config({ cutoverAt: 'not-an-instant' }), OPTIONS(new Date(2026, 7, 20))),
      [],
    );
  });
});

describe('resolveAnnouncements — the fire instant', () => {
  it('fires on the morning of the cutover’s local date, not at its midnight', () => {
    // A cutover expressed as local midnight on 1 September, whatever that is in UTC.
    const cutoverAt = new Date(2026, 8, 1, 0, 0, 0).toISOString();
    const [announcement] = resolveAnnouncements(config({ cutoverAt }), OPTIONS(new Date(2026, 7, 20)));

    assert.ok(announcement);
    assert.deepEqual(announcement.fireAt, new Date(2026, 8, 1, ANNOUNCE_HOUR_LOCAL, 0, 0, 0));
  });

  /**
   * The `toISOString()` trap, in the form it takes here.
   *
   * A cutover at local midnight serialises to a UTC instant that, west of
   * Greenwich, lands on the FOLLOWING UTC day. An implementation that read the
   * UTC calendar date would announce on 2 September. Constructing the fixture
   * from a local instant makes this assertion hold — and fail correctly — in
   * every timezone, rather than only in the one CI happens to run in.
   */
  it('derives the calendar date locally, so a UTC-day rollover does not shift it', () => {
    const localMidnight = new Date(2026, 8, 1, 0, 0, 0);
    const [announcement] = resolveAnnouncements(
      config({ cutoverAt: localMidnight.toISOString() }),
      OPTIONS(new Date(2026, 7, 20)),
    );

    assert.equal(announcement.fireAt.getFullYear(), 2026);
    assert.equal(announcement.fireAt.getMonth(), 8, 'September, never October');
    assert.equal(announcement.fireAt.getDate(), 1, 'the 1st, never the 2nd');
    assert.equal(announcement.fireAt.getHours(), ANNOUNCE_HOUR_LOCAL);
  });

  it('handles a cutover sent in a non-UTC offset — the winter case', () => {
    // Mirrors test_schedule_phase.py:83, which exists because a winter cutover
    // at Azores local midnight is 01:00 UTC.
    const cutoverAt = '2027-01-01T00:00:00-01:00';
    const [announcement] = resolveAnnouncements(
      config({ cutoverAt }),
      OPTIONS(new Date(2026, 11, 20)),
    );

    const instant = new Date(Date.parse(cutoverAt));
    assert.equal(announcement.fireAt.getFullYear(), instant.getFullYear());
    assert.equal(announcement.fireAt.getMonth(), instant.getMonth());
    assert.equal(announcement.fireAt.getDate(), instant.getDate());
    assert.equal(announcement.fireAt.getHours(), ANNOUNCE_HOUR_LOCAL);
  });

  it('still resolves later the same day when the rider opens the app before the hour', () => {
    const cutoverAt = new Date(2026, 8, 1, 0, 0, 0).toISOString();
    const [announcement] = resolveAnnouncements(
      config({ cutoverAt }),
      OPTIONS(new Date(2026, 8, 1, ANNOUNCE_HOUR_LOCAL - 1, 30)),
    );
    assert.ok(announcement, 'there is still time to warn them this morning');
  });
});

describe('resolveAnnouncements — the past-instant rule', () => {
  it('resolves nothing when the hour has already passed today', () => {
    const cutoverAt = new Date(2026, 8, 1, 0, 0, 0).toISOString();
    assert.deepEqual(
      resolveAnnouncements(
        config({ cutoverAt }),
        OPTIONS(new Date(2026, 8, 1, ANNOUNCE_HOUR_LOCAL + 2, 0)),
      ),
      [],
      'the banner is the better surface for someone already looking at the app',
    );
  });

  it('resolves nothing exactly on the hour — `fireAt <= now`, not `<`', () => {
    const cutoverAt = new Date(2026, 8, 1, 0, 0, 0).toISOString();
    assert.deepEqual(
      resolveAnnouncements(
        config({ cutoverAt }),
        OPTIONS(new Date(2026, 8, 1, ANNOUNCE_HOUR_LOCAL, 0, 0, 0)),
      ),
      [],
    );
  });

  it('resolves nothing for a cutover days in the past', () => {
    const cutoverAt = new Date(2026, 8, 1, 0, 0, 0).toISOString();
    assert.deepEqual(
      resolveAnnouncements(config({ cutoverAt }), OPTIONS(new Date(2026, 8, 10))),
      [],
    );
  });
});

describe('resolveAnnouncements — the dedupe key', () => {
  /**
   * The regression this file exists for. `resolveBanner()` merges the
   * `phases.preview` override INCLUDING its id, so the resolved banner id flips
   * from `azoresbus-preview-2026-08` to `azoresbus-live-2026-09` at the exact
   * instant the announcement is due. Keyed on that, the app records one id while
   * scheduling and looks up a different one afterwards — and schedules again.
   */
  it('is identical across the preview → live phase boundary', () => {
    const before = resolveAnnouncements(
      productionConfig('preview'),
      OPTIONS(new Date(2026, 7, 31, 12, 0)),
    );
    const at = resolveAnnouncements(productionConfig('live'), OPTIONS(new Date(2026, 7, 31, 23, 0)));

    assert.equal(before.length, 1);
    assert.equal(at.length, 1);
    assert.equal(before[0].id, at[0].id, 'the id must not move when the phase does');
  });

  it('is not the banner id under either phase', () => {
    const [announcement] = resolveAnnouncements(
      productionConfig('preview'),
      OPTIONS(new Date(2026, 7, 31, 12, 0)),
    );
    assert.notEqual(announcement.id, 'azoresbus-preview-2026-08');
    assert.notEqual(announcement.id, 'azoresbus-live-2026-09');
    assert.equal(announcement.id, announcementId('2026-09-01T00:00:00+00:00'));
  });

  it('resolves an announcement even with no banner at all', () => {
    const [announcement] = resolveAnnouncements(
      config({ banner: null }),
      OPTIONS(new Date(2026, 7, 20)),
    );
    assert.ok(announcement, 'the id does not depend on the banner');
  });

  it('changes when the operator moves the date — a moved cutover re-announces', () => {
    const first = resolveAnnouncements(
      config({ cutoverAt: new Date(2026, 8, 1).toISOString() }),
      OPTIONS(new Date(2026, 7, 20)),
    );
    const moved = resolveAnnouncements(
      config({ cutoverAt: new Date(2026, 8, 8).toISOString() }),
      OPTIONS(new Date(2026, 7, 20)),
    );
    assert.notEqual(first[0].id, moved[0].id);
  });
});

describe('resolveAnnouncements — content', () => {
  it('carries i18n keys that exist in en.json, never resolved strings', () => {
    const en = JSON.parse(
      readFileSync(join(process.cwd(), 'locales', 'en.json'), 'utf8'),
    ) as Record<string, string>;
    const [announcement] = resolveAnnouncements(
      config({ cutoverAt: new Date(2026, 8, 1).toISOString() }),
      OPTIONS(new Date(2026, 7, 20)),
    );

    assert.ok(announcement.titleKey in en, `${announcement.titleKey} missing from en.json`);
    assert.ok(announcement.bodyKey in en, `${announcement.bodyKey} missing from en.json`);
  });

  it('lands on transit, where ScheduleChangeBanner explains it in full', () => {
    const [announcement] = resolveAnnouncements(
      config({ cutoverAt: new Date(2026, 8, 1).toISOString() }),
      OPTIONS(new Date(2026, 7, 20)),
    );
    assert.equal(announcement.route, '/(tabs)/transit');
  });

  /** Guideline 4.5.4, as a test: no notification may carry marketing (11 §I1.1). */
  it('carries no paywall or premium route', () => {
    const [announcement] = resolveAnnouncements(
      config({ cutoverAt: new Date(2026, 8, 1).toISOString() }),
      OPTIONS(new Date(2026, 7, 20)),
    );
    assert.ok(!/paywall|premium|subscri/i.test(announcement.route));
    assert.ok(!/premium|subscri/i.test(announcement.titleKey + announcement.bodyKey));
  });
});
