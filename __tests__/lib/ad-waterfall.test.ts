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
      }),
      null,
    );
  });

  it('prefers first-party when inventory exists', () => {
    assert.equal(
      resolveAdSlotKind({
        enabled: true,
        firstParty: sampleAd,
        fetched: true,
        canShowAdMob: true,
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
      }),
      'admob',
    );
  });

  it('falls back to AdMob for free users without personalized ads consent', () => {
    assert.equal(
      resolveAdSlotKind({
        enabled: true,
        firstParty: null,
        fetched: true,
        canShowAdMob: true,
      }),
      'admob',
    );
  });

  it('returns null when first-party is empty and AdMob is not allowed', () => {
    assert.equal(
      resolveAdSlotKind({
        enabled: true,
        firstParty: null,
        fetched: true,
        canShowAdMob: false,
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
      }),
      null,
    );
  });
});
