import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeAd } from 'react-native-google-mobile-ads';

import { getAdMobModule } from '@/features/ads/lib/admob-native';
import { getAdMobRequestOptions } from '@/features/ads/lib/admob-request-options';
import { useAdViewport } from '@/features/ads/lib/ad-viewport';
import { getAdMobNativeUnitId } from '@/config/admob';
import { track } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  on: string;
  slot?: string | number;
  /**
   * Rendered when the request comes back with no fill. Passed as an element
   * rather than a callback so the failure never travels back up: the parent
   * does not re-render, and the fallback's own impression tracking only fires
   * if it actually mounts.
   */
  fallback?: React.ReactNode;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; ad: NativeAd }
  | { status: 'failed' };

/**
 * How far below the fold a slot starts loading. Roughly half a screen of lead
 * time, so the card is ready by the time the rider scrolls onto it.
 */
const PRELOAD_MARGIN = 400;

/**
 * AdMob Native Advanced card for the inline slots between transit results.
 *
 * Unlike a banner we own the layout here, which is exactly why the policy
 * rules bite harder. Every tappable element is registered through
 * `NativeAsset`; a `Pressable` of our own around the card would break Google's
 * click reporting and violate policy. AdChoices is requested in the card's
 * top-right, so nothing of ours goes there, and nothing clips the creative —
 * see the same warning atop `AdMobBanner.native.tsx`.
 */
export function AdMobNativeAd({ on, slot, fallback }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const unitId = getAdMobNativeUnitId();
  const mod = getAdMobModule();
  const viewport = useAdViewport();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // Outside a viewport provider there is nothing to wait for, so load at once —
  // that is how every pre-existing AdBanner call site behaves.
  const [nearViewport, setNearViewport] = useState(viewport == null);
  const hostRef = useRef<View>(null);

  /**
   * The ad view is snapped to whole points. Google's validator compares each
   * asset's frame against the ad view's frame in float precision, and on 3x
   * screens Yoga lays text out in thirds of a point — so a child edge at
   * 637.333 against an ad view of 637.333 rounded the other way reads as
   * "assets outside native ad view" (react-native-google-mobile-ads #700).
   * The inner content block is measured unconstrained: the ad view is always
   * at least as tall as what it holds, never wider, and it tracks reflow.
   */
  const [adViewSize, setAdViewSize] = useState<{ width: number; height: number } | null>(null);
  const onAdContentLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const next = { width: Math.floor(width), height: Math.ceil(height) };
    setAdViewSize((current) =>
      current && current.width === next.width && current.height === next.height ? current : next,
    );
  }, []);

  const slotLabel = String(slot ?? 'inline');

  // One-way latch: once a slot has been close enough to load, scrolling back
  // past it must never unload it — destroying and re-requesting an ad the rider
  // has already seen would be worse than never lazy-loading at all.
  const checkViewport = useCallback(() => {
    hostRef.current?.measureInWindow((_x, y) => {
      if (y < Dimensions.get('window').height + PRELOAD_MARGIN) {
        setNearViewport(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!viewport || nearViewport) {
      return;
    }
    checkViewport();
    return viewport.subscribe(checkViewport);
  }, [checkViewport, nearViewport, viewport]);

  useEffect(() => {
    if (!nearViewport) {
      return;
    }
    if (!unitId || !mod) {
      setState({ status: 'failed' });
      return;
    }

    let cancelled = false;
    let created: NativeAd | null = null;
    setState({ status: 'loading' });

    // No `aspectRatio` preference here. It is a server-side creative filter,
    // not a layout hint: with it set to LANDSCAPE, Google's own sample native
    // unit returned "No ad to show" on every request because its one sample
    // creative did not match. On this island's thin inventory the same filter
    // would quietly zero out real fill. Portrait media is handled at render
    // time instead — see `showMedia` below.
    mod.NativeAd.createForAdRequest(unitId, {
      ...getAdMobRequestOptions(),
      // AdChoices owns the view's top-right corner; nothing of ours goes there.
      adChoicesPlacement: mod.NativeAdChoicesPlacement.TOP_RIGHT,
      startVideoMuted: true,
    })
      .then((ad) => {
        created = ad;
        // Losing the race to an unmount means destroying it here instead.
        if (cancelled) {
          ad.destroy();
          return;
        }
        setState({ status: 'loaded', ad });
      })
      .catch((error: unknown) => {
        // No fill is the ordinary outcome, not an error worth shouting about.
        logger.debug('AdMob native ad load failed', error);
        track('transit', 'ad_mob_native_no_fill', { on, slot: slotLabel });
        if (!cancelled) {
          setState({ status: 'failed' });
        }
      });

    return () => {
      cancelled = true;
      // `destroy()` also removes every event listener and the native
      // subscription, so it is the only cleanup needed. Skipping it leaks the
      // native media view, and a new search unmounts every inline slot at once.
      created?.destroy();
    };
  }, [mod, nearViewport, on, slotLabel, unitId]);

  // The SDK reports the real, viewability-verified impression — track from its
  // events rather than on mount, so a re-render can never double-count.
  useEffect(() => {
    if (state.status !== 'loaded' || !mod) {
      return;
    }
    const { ad } = state;
    const subscriptions = [
      ad.addAdEventListener(mod.NativeAdEventType.IMPRESSION, () => {
        track('transit', 'ad_mob_native_impression', { on, slot: slotLabel });
      }),
      ad.addAdEventListener(mod.NativeAdEventType.CLICKED, () => {
        track('transit', 'ad_mob_native_click', { on, slot: slotLabel });
      }),
    ];
    return () => {
      for (const subscription of subscriptions) {
        subscription.remove();
      }
    };
  }, [mod, on, slotLabel, state]);

  // A slot still waiting on the viewport has to be measurable, so it renders an
  // empty host rather than nothing. `collapsable={false}` keeps Android from
  // optimising that host out of the native tree, which would break the measure.
  if (state.status === 'failed') {
    return <>{fallback ?? null}</>;
  }

  if (state.status !== 'loaded' || !mod) {
    return <View ref={hostRef} onLayout={checkViewport} collapsable={false} />;
  }

  const { ad } = state;
  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } = mod;

  // `NativeMediaView` sizes itself from `mediaContent.aspectRatio`. Skip it
  // when there is no media (the view would collapse to zero height) or when
  // the creative is portrait (a 9:16 image in a full-width card swamps the
  // results list) — the card then stands on icon + text + CTA. This is the
  // render-side answer to the layout concern; filtering at request time
  // instead costs fill. Never clamp with an aspectRatio or maxHeight of our
  // own — resizing or cropping a creative is the policy violation.
  const mediaRatio = ad.mediaContent?.aspectRatio;
  const showMedia = typeof mediaRatio === 'number' && mediaRatio >= 1;

  return (
    // The card chrome lives on a plain outer View, never on NativeAdView. React
    // Native sizes a host component's contentView — where this library mounts
    // the GADNativeAdView and our children — to the CONTENT box, inside padding
    // and border. Padding here would shrink Google's ad view while Yoga still
    // offsets every child by that padding, so each asset spills past the edge
    // and the validator reports "assets outside native ad view". Zero padding
    // and zero border keep content box == bounds.
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <NativeAdView
        // `NativeAsset` registers its node once, when the view mounts. Keying on
        // the response id guarantees a fresh subtree per ad, so assets can never
        // stay registered against a previous one.
        key={ad.responseId}
        nativeAd={ad}
        style={[styles.adView, adViewSize]}
      >
      {/* Measured as one block so the ad view can snap to it — see onAdContentLayout. */}
      <View style={styles.adContent} onLayout={onAdContentLayout}>
      {showMedia ? <NativeMediaView resizeMode="cover" style={styles.media} /> : null}

      <View style={styles.header}>
        {ad.icon?.url ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image
              source={{ uri: ad.icon.url }}
              style={styles.icon}
              accessibilityIgnoresInvertColors
            />
          </NativeAsset>
        ) : null}
        <View style={styles.headerText}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={[styles.headline, { color: theme.text }]} numberOfLines={2}>
              {ad.headline}
            </Text>
          </NativeAsset>
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <Text style={[styles.badgeText, { color: theme.onPrimary }]}>
                {t('transitAdLabel')}
              </Text>
            </View>
            {/* No ADVERTISER asset: optional under Google's native policy, and
                the "Ad" badge already fills this row. */}
          </View>
        </View>
      </View>

      {ad.body ? (
        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text style={[styles.body, { color: theme.onSurfaceMuted }]} numberOfLines={3}>
            {ad.body}
          </Text>
        </NativeAsset>
      ) : null}

      {ad.callToAction ? (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          {/* The styled pill is the registered node itself, so the whole tap
              target is what Google registered — not a View wrapping a Text. */}
          <Text style={[styles.cta, { backgroundColor: theme.primary, color: theme.onPrimary }]}>
            {ad.callToAction}
          </Text>
        </NativeAsset>
      ) : null}
      </View>
      </NativeAdView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.md,
  },
  // No padding, no border — see the comment on the outer card View. Its
  // whole-point size is applied at runtime, see onAdContentLayout.
  adView: { width: '100%' },
  adContent: { gap: space.sm },
  media: { width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  icon: { width: 40, height: 40, borderRadius: radius.sm },
  headerText: { flex: 1, gap: space.xs },
  headline: { ...typography.label, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  badge: {
    paddingHorizontal: space.xs,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  badgeText: { ...typography.overline, fontSize: 9, letterSpacing: 0.8 },
  body: { ...typography.caption },
  cta: {
    ...typography.label,
    textAlign: 'center',
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
  },
});
