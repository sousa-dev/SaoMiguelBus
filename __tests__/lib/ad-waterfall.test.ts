import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveAdSlotKind } from '@/features/ads/lib/ad-slot';
import type { AdPayload } from '@/lib/types';

const sampleAd: AdPayload = {
  id: 1,
  entity: 'Test',
  description: '',
  media: 'https://example.com/ad.png',
  start: null,
  end: null,
  action: null,
  target: null,
};

describe('resolveAdSlotKind', () => {
  it('returns null when slot is disabled', () => {
    assert.equal(
      resolveAdSlotKind({
        enabled: false,
        firstParty: sampleAd,
        fetched: true,
        canShowAdMob: true,
        isOnline: true,
        offlineInternalEligible: false,
      }),
      null,
    );
  });

  it('prefers forced internal in DEV QA mode', () => {
    assert.equal(
      resolveAdSlotKind({
        enabled: true,
        forceInternal: true,
        firstParty: sampleAd,
        fetched: true,
        canShowAdMob: true,
        isOnline: true,
        offlineInternalEligible: false,
      }),
      'internal',
    );
  });

  it('prefers first-party when inventory exists', () => {
    assert.equal(
      resolveAdSlotKind({
        enabled: true,
        firstParty: sampleAd,
        fetched: true,
        canShowAdMob: true,
        isOnline: true,
        offlineInternalEligible: false,
      }),
      'first-party',
    );
  });

  it('falls back to AdMob after fetch when first-party is empty', () => {
    assert.equal(
      resolveAdSlotKind({
        enabled: true,
        firstParty: null,
        fetched: true,
        canShowAdMob: true,
        isOnline: true,
        offlineInternalEligible: false,
      }),
      'admob',
    );
  });

  it('falls back to internal when online fetch is empty and AdMob unavailable', () => {
    assert.equal(
      resolveAdSlotKind({
        enabled: true,
        firstParty: null,
        fetched: true,
        canShowAdMob: false,
        isOnline: true,
        offlineInternalEligible: false,
      }),
      'internal',
    );
  });

  it('falls back to internal offline when gate passes', () => {
    assert.equal(
      resolveAdSlotKind({
        enabled: true,
        firstParty: null,
        fetched: false,
        canShowAdMob: false,
        isOnline: false,
        offlineInternalEligible: true,
      }),
      'internal',
    );
  });

  it('returns null offline when gate fails', () => {
    assert.equal(
      resolveAdSlotKind({
        enabled: true,
        firstParty: null,
        fetched: false,
        canShowAdMob: false,
        isOnline: false,
        offlineInternalEligible: false,
      }),
      null,
    );
  });

  it('waits for fetch before AdMob fallback', () => {
    assert.equal(
      resolveAdSlotKind({
        enabled: true,
        firstParty: null,
        fetched: false,
        canShowAdMob: true,
        isOnline: true,
        offlineInternalEligible: false,
      }),
      null,
    );
  });
});
