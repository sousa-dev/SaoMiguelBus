import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { scrollTargetIndex } from '@/features/live-tracking/lib/liveVehicleSheetScroll';
import type { MinibusLiveEtaRow } from '@/features/live-tracking/lib/liveEtas';

const row = (sequence: number, isCurrent: boolean): MinibusLiveEtaRow => ({
  sequence,
  stopName: `Stop ${sequence}`,
  stopCode: null,
  etaLabel: isCurrent ? 'Now' : '5 min',
  isCurrent,
});

describe('scrollTargetIndex', () => {
  it('returns the current stop row index', () => {
    const rows = [row(1, false), row(4, true), row(5, false)];
    assert.equal(scrollTargetIndex(rows), 1);
  });

  it('falls back to the first row when none is current', () => {
    const rows = [row(1, false), row(2, false)];
    assert.equal(scrollTargetIndex(rows), 0);
  });

  it('returns -1 for an empty list', () => {
    assert.equal(scrollTargetIndex([]), -1);
  });
});
