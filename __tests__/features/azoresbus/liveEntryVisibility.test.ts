import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isAzoresbusLiveEntryEnabled,
  shouldShowAzoresbusLiveEntry,
} from '@/features/azoresbus/lib/liveEntryVisibility';
import { isAzoresbusTrackingAvailable } from '@/features/azoresbus/lib/trackingHealth';
import type { AzoresbusTrackingHealthResponse } from '@/lib/types';

const ok: AzoresbusTrackingHealthResponse = { status: 'ok', vehicles: 31 };
const disabled: AzoresbusTrackingHealthResponse = { status: 'disabled', vehicles: 0 };
const unavailable: AzoresbusTrackingHealthResponse = { status: 'unavailable', vehicles: 0 };

describe('isAzoresbusTrackingAvailable', () => {
  it('is true only for an explicit ok', () => {
    assert.equal(isAzoresbusTrackingAvailable(ok), true);
    assert.equal(isAzoresbusTrackingAvailable(disabled), false);
    assert.equal(isAzoresbusTrackingAvailable(unavailable), false);
    assert.equal(isAzoresbusTrackingAvailable(undefined), false);
  });
});

describe('shouldShowAzoresbusLiveEntry', () => {
  it('shows when the flag is on and the feed is up', () => {
    assert.equal(shouldShowAzoresbusLiveEntry(true, true, ok), true);
  });

  it('hides entirely when the server flag is off, however healthy the feed', () => {
    // The flag is how the feature gets retired without an app release, so it
    // has to win over every other signal.
    assert.equal(shouldShowAzoresbusLiveEntry(false, true, ok), false);
    assert.equal(shouldShowAzoresbusLiveEntry(false, false, ok), false);
  });

  it('hides when online but the AVL is down', () => {
    // Nothing behind the card, so offering it would waste an ad impression.
    assert.equal(shouldShowAzoresbusLiveEntry(true, true, unavailable), false);
  });

  it('still shows offline, so the feature does not appear to have been removed', () => {
    assert.equal(shouldShowAzoresbusLiveEntry(true, false, undefined), true);
    assert.equal(shouldShowAzoresbusLiveEntry(true, false, unavailable), true);
  });
});

describe('isAzoresbusLiveEntryEnabled', () => {
  it('is enabled only when the flag, the network and the feed all agree', () => {
    assert.equal(isAzoresbusLiveEntryEnabled(true, true, ok), true);
  });

  it('is disabled offline even though the card is still shown', () => {
    assert.equal(isAzoresbusLiveEntryEnabled(true, false, ok), false);
  });

  it('is disabled when the flag is off or the feed is down', () => {
    assert.equal(isAzoresbusLiveEntryEnabled(false, true, ok), false);
    assert.equal(isAzoresbusLiveEntryEnabled(true, true, unavailable), false);
    assert.equal(isAzoresbusLiveEntryEnabled(true, true, undefined), false);
  });
});
