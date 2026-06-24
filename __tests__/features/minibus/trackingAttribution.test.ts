import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MINIBUS_PUBLIC_TRACKING_URL,
  resolvePublicTrackingUrl,
} from '@/features/minibus/lib/trackingAttribution';

describe('resolvePublicTrackingUrl', () => {
  it('returns the public tracker for the legacy AVL host', () => {
    assert.equal(resolvePublicTrackingUrl('https://pdl.elevensystems.pt'), MINIBUS_PUBLIC_TRACKING_URL);
    assert.equal(
      resolvePublicTrackingUrl('https://pdl.elevensystems.pt/publicapi/locations'),
      MINIBUS_PUBLIC_TRACKING_URL,
    );
  });

  it('returns the public tracker for empty or invalid values', () => {
    assert.equal(resolvePublicTrackingUrl(null), MINIBUS_PUBLIC_TRACKING_URL);
    assert.equal(resolvePublicTrackingUrl(''), MINIBUS_PUBLIC_TRACKING_URL);
    assert.equal(resolvePublicTrackingUrl('not-a-url'), MINIBUS_PUBLIC_TRACKING_URL);
  });

  it('returns the public tracker for tracking host without /pdl path', () => {
    assert.equal(
      resolvePublicTrackingUrl('https://tracking.elevensystems.pt'),
      MINIBUS_PUBLIC_TRACKING_URL,
    );
  });
});
