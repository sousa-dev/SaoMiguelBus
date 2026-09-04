import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Guards the AdMob Native Advanced card. There is no renderer in this test
 * setup, so these are source-text checks — the same technique
 * `screen-banner-coverage.test.ts` uses to pin an ad invariant it cannot
 * render. Each assertion carries the reason it exists, because every one of
 * them is a Google policy rule or a leak, not a style preference.
 */

const NATIVE_AD = join(process.cwd(), 'features/ads/components/AdMobNativeAd.native.tsx');
const WEB_STUB = join(process.cwd(), 'features/ads/components/AdMobNativeAd.tsx');

const source = readFileSync(NATIVE_AD, 'utf8');

describe('AdMob native ad card', () => {
  it('renders the ad through the SDK view, assets and media view', () => {
    for (const symbol of ['NativeAdView', 'NativeAsset', 'NativeMediaView']) {
      assert.ok(source.includes(symbol), `expected the card to render <${symbol}>`);
    }
  });

  it('never wraps the ad in a press handler of its own', () => {
    for (const pattern of [
      /<Pressable\b/,
      /<TouchableOpacity\b/,
      /<TouchableWithoutFeedback\b/,
      /\bonPress=/,
    ]) {
      assert.ok(
        !pattern.test(source),
        `found ${pattern} — wrapping a native ad in our own press handler violates ` +
          `AdMob policy and breaks Google's click reporting. Clickable elements must ` +
          `be registered through <NativeAsset> instead.`,
      );
    }
  });

  it('never clips the creative or its attribution', () => {
    assert.ok(
      !/overflow:\s*['"]hidden['"]/.test(source),
      `found overflow: 'hidden' — clipping a Google ad, its media, or its ` +
        `AdChoices/"Ad" attribution is a policy violation. See the same warning ` +
        `at the top of AdMobBanner.native.tsx.`,
    );
  });

  it('never overrides the media view’s own aspect ratio', () => {
    // NativeMediaView styles itself with the creative's real aspectRatio; a
    // style of ours lands after it in the array and would win, distorting the
    // creative.
    const mediaStyle = /styles\.media[\s\S]{0,200}?}/.exec(
      source.slice(source.indexOf('media:')),
    );
    assert.ok(
      !/aspectRatio|height/.test(mediaStyle?.[0] ?? ''),
      'styles.media must not set aspectRatio or height — NativeMediaView sizes ' +
        'itself from mediaContent.aspectRatio, and our style would override it, ' +
        'resizing the creative.',
    );
  });

  it('does not register the optional ADVERTISER asset', () => {
    assert.ok(
      !/NativeAssetType\.ADVERTISER/.test(source),
      'the advertiser asset is optional under Google policy and the "Ad" badge ' +
        'already fills that row — add it back only with a layout reason',
    );
  });

  it('snaps the NativeAdView to whole points', () => {
    // Google's validator compares asset frames to the ad view frame in float
    // precision; on 3x screens Yoga lays text out in thirds of a point, so a
    // fractional ad-view height reads as "assets outside native ad view"
    // (react-native-google-mobile-ads #700).
    assert.match(
      source,
      /height:\s*Math\.ceil\(height\)/,
      'the ad view height must be rounded UP to a whole point so it always ' +
        'contains its content',
    );
    assert.match(
      source,
      /width:\s*Math\.floor\(width\)/,
      'the ad view width must be rounded DOWN so its children never extend past it',
    );
    assert.match(
      source,
      /<NativeAdView[\s\S]*?style=\{\[styles\.adView, adViewSize\]\}/,
      'the measured whole-point size must be applied to the NativeAdView',
    );
  });

  it('puts no padding or border on the NativeAdView itself', () => {
    // React Native sizes a host component's contentView — where this library
    // mounts the GADNativeAdView and our children — to the content box inside
    // padding and border, while Yoga still offsets children by that padding.
    // Any padding/border on NativeAdView pushes every asset past the ad view's
    // edge and Google's validator reports "assets outside native ad view".
    const adViewStyle = /adView:\s*\{[^}]*\}/.exec(source)?.[0] ?? '';
    assert.ok(adViewStyle, 'expected a styles.adView block for the NativeAdView');
    assert.ok(
      !/padding|border/.test(adViewStyle),
      'styles.adView must carry no padding or border — put card chrome on the ' +
        'outer View instead',
    );
    assert.match(
      source,
      /<NativeAdView[\s\S]*?style=\{\[styles\.adView, adViewSize\]\}/,
      'the NativeAdView must use styles.adView, the unpadded style',
    );
  });

  it('never sends an aspectRatio preference with the request', () => {
    assert.ok(
      !/aspectRatio:\s*mod\.NativeMediaAspectRatio/.test(source),
      'aspectRatio is a server-side creative filter, not a layout hint. Set to ' +
        'LANDSCAPE it made Google\'s own sample native unit return "No ad to ' +
        'show" on every request, and on thin real inventory it silently zeroes ' +
        'fill. Handle portrait media at render time (the showMedia guard) instead.',
    );
    assert.match(
      source,
      /mediaRatio\s*>=\s*1/,
      'portrait creatives must be handled at render time by skipping the media ' +
        'view, since they are no longer filtered out of the request',
    );
  });

  it('destroys the ad on unmount, guarded against the unmount race', () => {
    assert.ok(
      source.includes('.destroy()'),
      'an undestroyed NativeAd leaks its native media view, and a new search ' +
        'unmounts every inline slot at once',
    );
    assert.ok(
      source.includes('cancelled'),
      'the load promise must be guarded: an ad that resolves after unmount has ' +
        'to be destroyed rather than set into state',
    );
  });

  it('imports the SDK only as a type, never as a value', () => {
    assert.ok(
      !/^import\s+(?!type\b)[^;]*from\s+'react-native-google-mobile-ads'/m.test(source),
      'a value import evaluates the SDK at module scope and crashes Expo Go, ' +
        'defeating the NativeModules guard in features/ads/lib/admob-native.ts. ' +
        'Take values from getAdMobModule() instead.',
    );
  });

  it('has a web stub, which is the compile-time contract', () => {
    const stub = readFileSync(WEB_STUB, 'utf8');
    assert.ok(
      stub.includes('export function AdMobNativeAd'),
      'TypeScript resolves the non-platform file for every importer, so the web ' +
        'stub defines the props contract the native component must match',
    );
  });
});
