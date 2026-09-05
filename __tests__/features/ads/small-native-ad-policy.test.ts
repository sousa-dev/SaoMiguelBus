import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Guards the compact banner-replacement Native Advanced card, mirroring
 * `native-ad-policy.test.ts`. Most rules are the same Google policy
 * constraints that apply to any NativeAdView; the one that differs is media —
 * this card must never render one at all, since it has to stay banner-sized.
 */

const SMALL_NATIVE_AD = join(
  process.cwd(),
  'features/ads/components/SmallNativeAdView.native.tsx',
);
const WEB_STUB = join(process.cwd(), 'features/ads/components/SmallNativeAdView.tsx');

const source = readFileSync(SMALL_NATIVE_AD, 'utf8');

describe('AdMob small native ad card', () => {
  it('never renders a media view, so the card stays banner-sized', () => {
    assert.ok(
      !/NativeMediaView/.test(source),
      'a media view collapses the "roughly banner height" requirement — the ' +
        'compact card must render icon, headline, badge and CTA only',
    );
    assert.ok(
      !/mediaContent/.test(source),
      'the card must not even inspect mediaContent — that is the large card\'s job',
    );
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
          `AdMob policy and breaks Google's click reporting`,
      );
    }
  });

  it('never clips the creative or its attribution', () => {
    assert.ok(
      !/overflow:\s*['"]hidden['"]/.test(source),
      'clipping a Google ad or its AdChoices/"Ad" attribution is a policy violation',
    );
  });

  it('does not register the optional ADVERTISER asset', () => {
    assert.ok(
      !/NativeAssetType\.ADVERTISER/.test(source),
      'the advertiser asset is optional under Google policy and the "Ad" badge ' +
        'already fills that role',
    );
  });

  it('puts no padding or border on the NativeAdView itself', () => {
    const adViewStyle = /adView:\s*\{[^}]*\}/.exec(source)?.[0] ?? '';
    assert.ok(adViewStyle, 'expected a styles.adView block for the NativeAdView');
    assert.ok(
      !/padding|border/.test(adViewStyle),
      'styles.adView must carry no padding or border — put card chrome on the ' +
        'outer View instead',
    );
  });

  it('destroys the ad on unmount, guarded against the unmount race', () => {
    assert.ok(source.includes('.destroy()'), 'an undestroyed NativeAd leaks its native view');
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
        'defeating the NativeModules guard in features/ads/lib/admob-native.ts',
    );
  });

  it('has a web stub, which is the compile-time contract', () => {
    const stub = readFileSync(WEB_STUB, 'utf8');
    assert.ok(
      stub.includes('export function SmallNativeAdView'),
      'TypeScript resolves the non-platform file for every importer',
    );
  });

  it('reserves the top-right corner for the auto-inserted AdChoices overlay', () => {
    // On a backfill fill the SDK overlays an AdChoices icon in that corner
    // (react-native-google-mobile-ads docs, "AdChoices overlay"). The CTA
    // sits at the row's trailing edge, so without reserved space it collides
    // with the icon on backfill fills only — the intermittent failure this
    // guards against.
    const rowStyle = /row:\s*\{[^}]*\}/.exec(source)?.[0] ?? '';
    assert.ok(rowStyle, 'expected a styles.row block');
    assert.match(
      rowStyle,
      /paddingRight:\s*space\.\w+/,
      'styles.row must reserve right-side padding so the CTA never sits flush ' +
        'in the AdChoices corner',
    );
  });

  it('falls back to a real AdMob banner on no fill, not a house ad', () => {
    assert.match(
      source,
      /status === 'failed'[\s\S]*?<AdMobBanner/,
      'requirement is a standard Banner Ad in the same container — the large ' +
        'card falls back to an internal creative instead, which is the wrong ' +
        'fallback here',
    );
  });
});
