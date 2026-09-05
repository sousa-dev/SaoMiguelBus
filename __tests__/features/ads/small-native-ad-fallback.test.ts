import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Locks in the small native card's fallback design: unlike `AdMobNativeAd`,
 * it never takes a caller-supplied `fallback` prop — the fallback target is
 * always a real `AdMobBanner` in the same container, so the component owns
 * that decision itself.
 */

const source = readFileSync(
  join(process.cwd(), 'features/ads/components/SmallNativeAdView.native.tsx'),
  'utf8',
);

describe('SmallNativeAdView fallback wiring', () => {
  it('has no fallback prop — the fallback target is fixed, not caller-supplied', () => {
    const propsType = /type Props = \{[^}]*\}/.exec(source)?.[0] ?? '';
    assert.ok(propsType, 'expected a Props type declaration');
    assert.ok(
      !/fallback/.test(propsType),
      'a fallback prop would let a caller override the banner fallback, which ' +
        'is not the contract here — see AdMobNativeAd for the pattern this ' +
        'deliberately does not follow',
    );
  });

  it('treats a missing unit id or SDK module as a failure, not a silent no-op', () => {
    assert.match(
      source,
      /if \(!unitId \|\| !mod\) \{\s*setState\(\{ status: 'failed' \}\);/,
      'without this, a missing unit id would render nothing forever instead of ' +
        'falling back to the banner',
    );
  });

  it('marks the load as failed when the ad request rejects', () => {
    assert.match(
      source,
      /\.catch\([\s\S]*?setState\(\{ status: 'failed' \}\);/,
      'a no-fill/error response must still trigger the banner fallback',
    );
  });
});
