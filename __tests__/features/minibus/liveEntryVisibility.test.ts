import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isMinibusLiveEntryEnabled,
  shouldShowMinibusLiveEntry,
} from '@/features/minibus/lib/liveEntryVisibility';
import type { MinibusTrackingHealthResponse } from '@/lib/types';

const availableHealth: MinibusTrackingHealthResponse = {
  available: true,
  checkedAt: '2026-01-01T00:00:00Z',
  recheckAfterSeconds: 30,
};

const unavailableHealth: MinibusTrackingHealthResponse = {
  available: false,
  checkedAt: '2026-01-01T00:00:00Z',
  recheckAfterSeconds: 30,
};

describe('shouldShowMinibusLiveEntry', () => {
  it('shows when online and tracking is available', () => {
    assert.equal(shouldShowMinibusLiveEntry(true, availableHealth), true);
  });

  it('hides when online and tracking is unavailable', () => {
    assert.equal(shouldShowMinibusLiveEntry(true, unavailableHealth), false);
  });

  it('shows when offline even with available cache', () => {
    assert.equal(shouldShowMinibusLiveEntry(false, availableHealth), true);
  });

  it('shows when offline with no health cache', () => {
    assert.equal(shouldShowMinibusLiveEntry(false, undefined), true);
  });
});

describe('isMinibusLiveEntryEnabled', () => {
  it('enables when online and tracking is available', () => {
    assert.equal(isMinibusLiveEntryEnabled(true, availableHealth), true);
  });

  it('disables when online and tracking is unavailable', () => {
    assert.equal(isMinibusLiveEntryEnabled(true, unavailableHealth), false);
  });

  it('disables when offline even with available cache', () => {
    assert.equal(isMinibusLiveEntryEnabled(false, availableHealth), false);
  });

  it('disables when offline with no health cache', () => {
    assert.equal(isMinibusLiveEntryEnabled(false, undefined), false);
  });
});
