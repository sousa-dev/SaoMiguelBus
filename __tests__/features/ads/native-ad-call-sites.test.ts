import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Pins where the large, full-size Native Advanced card (`format="native"`) is
 * used and where it deliberately is not. `format` defaults to `'banner'`,
 * which no longer means a raw adaptive banner — it now renders the compact
 * `SmallNativeAdView`, itself native-first with a banner fallback — so every
 * slot in this file gets *some* native ad; only the large card's rollout is
 * opt-in via `format="native"`.
 */

function read(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), 'utf8');
}

describe('native ad call sites', () => {
  it('renders native cards in the inline transit result slots', () => {
    const source = read('features/transit/components/RouteResults.tsx');
    assert.match(
      source,
      /<AdBanner[\s\S]*?format="native"[\s\S]*?\/>/,
      'the inline slots between journey cards are the native-ad rollout; without ' +
        'format="native" they silently fall back to adaptive banners',
    );
  });

  it('always shows at least one native ad on a results view', () => {
    // The inline rule first fires at index 1, so 1-2 results would render no
    // ad; and zero results never mount RouteResults at all. Both get one
    // native ad at the end instead.
    const results = read('features/transit/components/RouteResults.tsx');
    assert.match(
      results,
      /slot="inline-end"[^>]*format="native"/,
      'RouteResults must append a trailing native ad when no inline slot fires',
    );
    const screen = read('app/(tabs)/transit/index.tsx');
    assert.match(
      screen,
      /showEmptyResults \? <AdBanner[^>]*slot="inline-end"[^>]*format="native"/,
      'the no-results state must carry a native ad too',
    );
  });

  it('leaves the transit top slot on the default format', () => {
    // The default format is no longer a raw banner — it renders SmallNativeAdView,
    // which is itself native-first with a banner fallback. The large full-size
    // card (format="native") stays reserved for the inline result slots.
    const source = read('app/(tabs)/transit/index.tsx');
    const topBanner = /<AdBanner[^>]*slot="top"[^>]*\/>/.exec(source);
    assert.ok(topBanner, 'expected a top-slot AdBanner on the transit screen');
    assert.ok(
      !topBanner[0].includes('format="native"'),
      'the top slot must keep using the default format (compact card + banner ' +
        'fallback), not the large inline card',
    );
  });

  it('routes the default format through the compact card, not straight to a banner', () => {
    const source = read('features/ads/components/AdBanner.tsx');
    assert.match(
      source,
      /return <SmallNativeAdView on=\{on\} slot=\{slot\} \/>;/,
      'format="banner" (the default) must go through SmallNativeAdView\'s ' +
        'native-first, banner-fallback waterfall, not straight to AdMobBanner',
    );
  });

  it('wires the transit scroll view up to the ad viewport', () => {
    const source = read('app/(tabs)/transit/index.tsx');
    assert.match(
      source,
      /onScroll=\{adViewport\.onScroll\}/,
      'without onScroll the viewport never ticks, so every slot below the fold ' +
        'stays unloaded forever',
    );
    assert.match(
      source,
      /<AdViewportProvider[\s\S]*?<RouteResults/,
      'the provider must wrap RouteResults — outside one, slots fall back to ' +
        'loading immediately, which is the eager behaviour this replaced',
    );
  });

  it('gates the native ad request on the slot nearing the viewport', () => {
    const source = read('features/ads/components/AdMobNativeAd.native.tsx');
    assert.match(
      source,
      /if \(!nearViewport\) \{\s*return;/,
      'the load effect must bail until the slot is near the viewport, or a ' +
        '10-result search fires every native request at once',
    );
    assert.ok(
      !/setNearViewport\(false\)/.test(source),
      'the viewport latch is one-way — unloading an ad the rider already ' +
        'scrolled past would destroy and re-request it',
    );
  });

  it('falls back to the internal house ad when a native slot has no fill', () => {
    const source = read('features/ads/components/AdBanner.tsx');
    assert.ok(
      source.includes('fallbackCreative'),
      'AdBanner must read fallbackCreative from useAd to have a house ad in reserve',
    );
    assert.match(
      source,
      /<AdMobNativeAd[\s\S]*?fallback=/,
      'a no-fill native slot must render the house ad, not collapse to nothing',
    );
  });
});
