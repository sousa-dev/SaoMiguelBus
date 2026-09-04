import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';

/**
 * Reproduces the production (EAS release build) resolution of AdMob unit IDs.
 *
 * `.env` is listed in both `.gitignore` and `.easignore`, so an EAS build never
 * sees `EXPO_PUBLIC_ADMOB_*` unless it is defined as an EAS environment
 * variable. In that case every getter falls back to `config/admob-defaults.js`.
 */

const ADMOB_ENV_KEYS = [
  'EXPO_PUBLIC_ADMOB_REWARDED_ANDROID',
  'EXPO_PUBLIC_ADMOB_REWARDED_IOS',
  'EXPO_PUBLIC_ADMOB_NATIVE_ANDROID',
  'EXPO_PUBLIC_ADMOB_NATIVE_IOS',
];

/** Google's sample account. Serving these in a release build earns nothing. */
const GOOGLE_TEST_PUBLISHER = 'ca-app-pub-3940256099942544/';

const saved = new Map<string, string | undefined>();

before(() => {
  // Release builds have __DEV__ === false.
  (globalThis as Record<string, unknown>).__DEV__ = false;
  // Simulate an EAS build with no .env present.
  for (const key of ADMOB_ENV_KEYS) {
    saved.set(key, process.env[key]);
    delete process.env[key];
  }
});

after(() => {
  for (const [key, value] of saved) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe('AdMob unit IDs in a production build without .env', () => {
  it('resolves a rewarded unit on Android', async () => {
    const { getAdMobRewardedUnitId } = await import('@/config/admob.android');
    assert.notEqual(
      getAdMobRewardedUnitId(),
      null,
      'rewarded ad-free offer is silently disabled without a rewarded unit ID',
    );
  });

  it('resolves a rewarded unit on iOS', async () => {
    const { getAdMobRewardedUnitId } = await import('@/config/admob.ios');
    assert.notEqual(
      getAdMobRewardedUnitId(),
      null,
      'rewarded ad-free offer is silently disabled without a rewarded unit ID',
    );
  });

  it('resolves an interstitial unit on Android (control: has a default)', async () => {
    const { getAdMobInterstitialUnitId } = await import('@/config/admob.android');
    assert.notEqual(getAdMobInterstitialUnitId(), null);
  });

  it('resolves a real native unit on Android', async () => {
    const { getAdMobNativeUnitId } = await import('@/config/admob.android');
    const unitId = getAdMobNativeUnitId();
    assert.notEqual(
      unitId,
      null,
      'inline transit slots silently fall back to the house ad without a native unit ID',
    );
    assert.ok(
      !unitId?.startsWith(GOOGLE_TEST_PUBLISHER),
      'release builds must not serve Google sample native ads — that earns nothing, and means the __DEV__ branch leaked',
    );
  });

  it('resolves a real native unit on iOS', async () => {
    const { getAdMobNativeUnitId } = await import('@/config/admob.ios');
    const unitId = getAdMobNativeUnitId();
    assert.notEqual(
      unitId,
      null,
      'inline transit slots silently fall back to the house ad without a native unit ID',
    );
    assert.ok(
      !unitId?.startsWith(GOOGLE_TEST_PUBLISHER),
      'release builds must not serve Google sample native ads — that earns nothing, and means the __DEV__ branch leaked',
    );
  });
});
