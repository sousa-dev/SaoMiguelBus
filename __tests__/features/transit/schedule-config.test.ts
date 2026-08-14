/**
 * 03 §1-§4 — every phase decision comes from `transitSchedule`, never a date
 * literal. These are the pure decisions the banner, the badge, the preview
 * toggle, the search request and the tracking gate all render from.
 *
 * Two things the plan got wrong about the deployed contract, both load-bearing:
 *
 *  - `transitSchedule` is ALWAYS present, even for an island with no azoresbus
 *    flags. Absence can no longer mean "not configured", so the gate is
 *    `cutoverAt != null`.
 *  - The server sends `banner` and `badge` in EVERY phase — production is seeded
 *    with live copy right now, while `phase: 'preview'` and `cutoverAt: null`.
 *    Without a client-side phase gate the app would announce the new timetables
 *    today.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  bannerCopy,
  canTrack,
  nextPreviewDataset,
  resolveScheduleUi,
  searchDataset,
  shouldInvalidateAt,
} from '@/features/transit/lib/schedule-config';
import type { TransitScheduleConfig } from '@/lib/types';

const BANNER = {
  id: 'azoresbus-live-2026-09',
  tone: 'info' as const,
  dismissible: false,
  text: { pt: 'Os novos horários já estão em vigor.', en: 'The new timetables are live.' },
};

const BADGE = { text: { pt: 'Válido desde 1 de setembro', en: 'Valid since 1 September' } };

function config(overrides: Partial<TransitScheduleConfig> = {}): TransitScheduleConfig {
  return {
    activeDataset: 'legacy',
    previewDataset: null,
    cutoverAt: '2026-09-01T00:00:00+00:00',
    nextTransitionAt: '2026-10-01T00:00:00+00:00',
    phase: 'preview',
    banner: BANNER,
    badge: BADGE,
    trackingEnabled: false,
    ...overrides,
  };
}

/** Exactly what api.saomiguelhub.com serves today. */
const PRODUCTION_TODAY = config({ cutoverAt: null, previewDataset: null, phase: 'preview' });

describe('resolveScheduleUi — back-compat', () => {
  it('renders nothing when there is no config at all', () => {
    const ui = resolveScheduleUi(null, { isPreviewing: false });
    assert.equal(ui.isConfigured, false);
    assert.equal(ui.showBanner, false);
    assert.equal(ui.showBadge, false);
    assert.equal(ui.showToggle, false);
    assert.equal(ui.dataset, null);
  });

  it('renders nothing against the block production serves today', () => {
    // cutoverAt is null but a live-copy banner IS present and phase IS preview.
    const ui = resolveScheduleUi(PRODUCTION_TODAY, { isPreviewing: false });
    assert.equal(ui.isConfigured, false, 'no cutover armed means nothing to announce');
    assert.equal(ui.showBanner, false, 'would otherwise say the new timetables are live');
    assert.equal(ui.showBadge, false);
    assert.equal(ui.showToggle, false);
  });

  it('treats a missing azoresbus block the same as an unconfigured one', () => {
    const bare = config({ cutoverAt: null, banner: null, badge: null });
    assert.equal(resolveScheduleUi(bare, { isPreviewing: false }).isConfigured, false);
  });
});

describe('resolveScheduleUi — phases', () => {
  it('preview: banner and toggle, no badge', () => {
    const ui = resolveScheduleUi(
      config({ phase: 'preview', previewDataset: 'azoresbus' }),
      { isPreviewing: false },
    );
    assert.equal(ui.showBanner, true);
    assert.equal(ui.showToggle, true);
    assert.equal(ui.showBadge, false);
  });

  it('preview without previewEnabled: banner, no toggle', () => {
    const ui = resolveScheduleUi(
      config({ phase: 'preview', previewDataset: null }),
      { isPreviewing: false },
    );
    assert.equal(ui.showBanner, true);
    assert.equal(ui.showToggle, false, 'nothing to preview');
  });

  it('live: banner and badge, no toggle', () => {
    const ui = resolveScheduleUi(
      config({ phase: 'live', activeDataset: 'azoresbus', previewDataset: null }),
      { isPreviewing: false },
    );
    assert.equal(ui.showBanner, true);
    assert.equal(ui.showBadge, true);
    assert.equal(ui.showToggle, false);
  });

  it('settled: nothing, even though the server still sends banner and badge', () => {
    const settled = config({
      phase: 'settled', activeDataset: 'azoresbus',
      previewDataset: null, nextTransitionAt: null,
    });
    assert.ok(settled.banner, 'the server does not null these out');
    const ui = resolveScheduleUi(settled, { isPreviewing: false });
    assert.equal(ui.showBanner, false, 'the banner retires with the phase');
    assert.equal(ui.showBadge, false);
  });
});

describe('resolveScheduleUi — preview warning and tracking', () => {
  it('warns on results only while actively previewing', () => {
    const previewable = config({ phase: 'preview', previewDataset: 'azoresbus' });
    assert.equal(
      resolveScheduleUi(previewable, { isPreviewing: false }).showPreviewWarning,
      false,
    );
    assert.equal(
      resolveScheduleUi(previewable, { isPreviewing: true }).showPreviewWarning,
      true,
    );
  });

  it('hides the tracking entry point unless the server enables it', () => {
    assert.equal(
      resolveScheduleUi(config({ trackingEnabled: false }), { isPreviewing: false }).showTracking,
      false,
    );
    assert.equal(
      resolveScheduleUi(config({ trackingEnabled: true }), { isPreviewing: false }).showTracking,
      true,
    );
  });

  it('disables bus tracking while previewing — alarms would fire on wrong days', () => {
    const previewable = config({ phase: 'preview', previewDataset: 'azoresbus' });
    assert.equal(canTrack(previewable, true), false);
    assert.equal(canTrack(previewable, false), true);
    assert.equal(canTrack(null, false), true, 'unconfigured must behave as today');
  });
});

describe('searchDataset — the app never pins itself to a network', () => {
  it('sends nothing when not previewing', () => {
    assert.equal(searchDataset(config({ previewDataset: 'azoresbus' }), false), null);
  });

  it('sends the preview dataset only while previewing', () => {
    assert.equal(searchDataset(config({ previewDataset: 'azoresbus' }), true), 'azoresbus');
  });

  it('never derives the dataset from a cached activeDataset (98 stale bootstrap)', () => {
    const stale = config({ activeDataset: 'legacy', previewDataset: null });
    assert.equal(searchDataset(stale, false), null);
    assert.equal(searchDataset(stale, true), null, 'nothing to preview means no param');
  });

  it('never sends dataset=legacy on a public URL', () => {
    const odd = config({ previewDataset: 'legacy' as never });
    assert.equal(searchDataset(odd, true), null);
  });
});

describe('nextPreviewDataset — a stale toggle clears itself', () => {
  it('keeps the flag while previewing is on offer', () => {
    const c = config({ phase: 'preview', previewDataset: 'azoresbus' });
    assert.equal(nextPreviewDataset(c, 'azoresbus'), 'azoresbus');
  });

  it('clears the flag once the phase moves on', () => {
    const c = config({ phase: 'live', previewDataset: null });
    assert.equal(nextPreviewDataset(c, 'azoresbus'), null);
  });

  it('clears the flag when preview is switched off server-side', () => {
    const c = config({ phase: 'preview', previewDataset: null });
    assert.equal(nextPreviewDataset(c, 'azoresbus'), null);
  });

  it('clears the flag when the config disappears', () => {
    assert.equal(nextPreviewDataset(null, 'azoresbus'), null);
  });
});

describe('shouldInvalidateAt — 98 stale bootstrap', () => {
  const c = config({ nextTransitionAt: '2026-10-01T00:00:00+00:00' });

  it('is false before the instant', () => {
    assert.equal(shouldInvalidateAt(c, Date.parse('2026-09-30T23:59:59Z')), false);
  });

  it('is true at and after the instant', () => {
    assert.equal(shouldInvalidateAt(c, Date.parse('2026-10-01T00:00:00Z')), true);
    assert.equal(shouldInvalidateAt(c, Date.parse('2026-10-02T00:00:00Z')), true);
  });

  it('is false when there is no transition to wait for', () => {
    assert.equal(shouldInvalidateAt(config({ nextTransitionAt: null }), Date.now()), false);
    assert.equal(shouldInvalidateAt(null, Date.now()), false);
  });

  it('ignores an unparseable instant rather than invalidating forever', () => {
    assert.equal(shouldInvalidateAt(config({ nextTransitionAt: 'soon' }), Date.now()), false);
  });
});

describe('cutoverAt is an INSTANT, not a local calendar date (98 §5 ch. 2)', () => {
  // A tourist whose phone is still on Lisbon time is an hour ahead of Azores.
  const cutover = '2026-09-01T00:00:00+00:00'; // Azores midnight, as an instant

  it('is still legacy at 23:30 Lisbon on 31 August (22:30 Azores)', () => {
    const ui = resolveScheduleUi(
      config({ cutoverAt: cutover, phase: 'preview' }),
      { isPreviewing: false, now: Date.parse('2026-08-31T22:30:00Z') },
    );
    assert.equal(ui.hasCrossedCutover, false);
  });

  it('has crossed at 01:30 Lisbon on 1 September', () => {
    const ui = resolveScheduleUi(
      config({ cutoverAt: cutover, phase: 'live' }),
      { isPreviewing: false, now: Date.parse('2026-09-01T00:30:00Z') },
    );
    assert.equal(ui.hasCrossedCutover, true);
  });

  it('never claims a crossing when no cutover is armed', () => {
    const ui = resolveScheduleUi(PRODUCTION_TODAY, { isPreviewing: false });
    assert.equal(ui.hasCrossedCutover, false);
  });
});

describe('bannerCopy — locale fallback', () => {
  it('prefers the active locale', () => {
    assert.equal(bannerCopy(BANNER, 'en'), BANNER.text.en);
  });

  it('falls back to pt, then to the first value', () => {
    assert.equal(bannerCopy(BANNER, 'de'), BANNER.text.pt);
    assert.equal(bannerCopy({ ...BANNER, text: { fr: 'Bonjour' } }, 'de'), 'Bonjour');
  });

  it('handles a region-tagged locale', () => {
    assert.equal(bannerCopy(BANNER, 'pt-PT'), BANNER.text.pt);
  });

  it('returns null when there is no copy at all', () => {
    assert.equal(bannerCopy(null, 'pt'), null);
    assert.equal(bannerCopy({ ...BANNER, text: {} }, 'pt'), null);
  });
});
