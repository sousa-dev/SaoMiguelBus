import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isLiveEntryEnabled } from '@/features/live-tracking/lib/liveEntryVisibility';
import { resolveLiveCount } from '@/features/live-tracking/lib/liveCounts';
import type { LiveVehicleCountEntry } from '@/lib/types';

const ok: LiveVehicleCountEntry = { status: 'ok', vehicles: 12, recordedAt: '2026-09-04T10:00:00Z' };
const okZero: LiveVehicleCountEntry = { status: 'ok', vehicles: 0, recordedAt: '2026-09-04T10:00:00Z' };
const unavailable: LiveVehicleCountEntry = { status: 'unavailable', vehicles: null, recordedAt: '2026-09-04T10:00:00Z' };
const disabled: LiveVehicleCountEntry = { status: 'disabled', vehicles: null, recordedAt: null };
const unknown: LiveVehicleCountEntry = { status: 'unknown', vehicles: null, recordedAt: null };

describe('resolveLiveCount', () => {
  it('an ok record is available with its count', () => {
    assert.deepEqual(resolveLiveCount(ok), { available: true, count: 12 });
  });

  it('a recorded zero is still available, not treated as an outage', () => {
    assert.deepEqual(resolveLiveCount(okZero), { available: true, count: 0 });
  });

  it('an unavailable record is not available and carries no count', () => {
    assert.deepEqual(resolveLiveCount(unavailable), { available: false, count: null });
  });

  it('a disabled record is not available', () => {
    assert.deepEqual(resolveLiveCount(disabled), { available: false, count: null });
  });

  it('unknown has no outage evidence, so it stays available with no count', () => {
    assert.deepEqual(resolveLiveCount(unknown), { available: true, count: null });
  });

  it('missing data (not loaded yet, or minibus not installed) behaves like unknown', () => {
    assert.deepEqual(resolveLiveCount(undefined), { available: true, count: null });
    assert.deepEqual(resolveLiveCount(null), { available: true, count: null });
  });
});

describe('composition with isLiveEntryEnabled', () => {
  it('an available record still disables the entry while offline', () => {
    const { available } = resolveLiveCount(ok);
    assert.equal(isLiveEntryEnabled(false, available), false);
  });

  it('an unavailable record disables the entry even while online', () => {
    const { available } = resolveLiveCount(unavailable);
    assert.equal(isLiveEntryEnabled(true, available), false);
  });

  it('an ok record online enables the entry', () => {
    const { available } = resolveLiveCount(ok);
    assert.equal(isLiveEntryEnabled(true, available), true);
  });
});
