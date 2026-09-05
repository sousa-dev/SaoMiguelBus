import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeAd } from 'react-native-google-mobile-ads';

import { AdMobBanner } from '@/features/ads/components/AdMobBanner';
import { getAdMobModule } from '@/features/ads/lib/admob-native';
import { getAdMobRequestOptions } from '@/features/ads/lib/admob-request-options';
import { getAdMobNativeSmallUnitId } from '@/config/admob';
import { track } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import { Skeleton } from '@/components/ui/Skeleton';

type Props = {
  on: string;
  slot?: string | number;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; ad: NativeAd }
  | { status: 'failed' };

/**
 * Compact AdMob Native Advanced card that drops into the same slots the plain
 * adaptive banner used to occupy. Deliberately renders no media asset — the
 * card must stay banner-sized — so on no-fill it falls back to a real
 * `AdMobBanner` in the same container rather than a house creative, which is
 * the large card's `AdMobNativeAd` fallback story instead.
 */
export function SmallNativeAdView({ on, slot }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const unitId = getAdMobNativeSmallUnitId();
  const mod = getAdMobModule();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const slotLabel = String(slot ?? 'top');

  // See AdMobNativeAd.native.tsx's onAdContentLayout for why this snaps to
  // whole points — the same Google validator rounding rule applies to every
  // NativeAdView, not just the large card's.
  const [adViewSize, setAdViewSize] = useState<{ width: number; height: number } | null>(null);
  const onAdContentLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const next = { width: Math.floor(width), height: Math.ceil(height) };
    setAdViewSize((current) =>
      current && current.width === next.width && current.height === next.height ? current : next,
    );
  }, []);

  useEffect(() => {
    if (!unitId || !mod) {
      setState({ status: 'failed' });
      return;
    }

    let cancelled = false;
    let created: NativeAd | null = null;
    setState({ status: 'loading' });

    mod.NativeAd.createForAdRequest(unitId, {
      ...getAdMobRequestOptions(),
      adChoicesPlacement: mod.NativeAdChoicesPlacement.TOP_RIGHT,
      startVideoMuted: true,
    })
      .then((ad) => {
        created = ad;
        if (cancelled) {
          ad.destroy();
          return;
        }
        setState({ status: 'loaded', ad });
      })
      .catch((error: unknown) => {
        logger.debug('AdMob small native ad load failed', error);
        track('transit', 'ad_mob_native_small_no_fill', { on, slot: slotLabel });
        if (!cancelled) {
          setState({ status: 'failed' });
        }
      });

    return () => {
      cancelled = true;
      created?.destroy();
    };
  }, [mod, on, slotLabel, unitId]);

  useEffect(() => {
    if (state.status !== 'loaded' || !mod) {
      return;
    }
    const { ad } = state;
    const subscriptions = [
      ad.addAdEventListener(mod.NativeAdEventType.IMPRESSION, () => {
        track('transit', 'ad_mob_native_small_impression', { on, slot: slotLabel });
      }),
      ad.addAdEventListener(mod.NativeAdEventType.CLICKED, () => {
        track('transit', 'ad_mob_native_small_click', { on, slot: slotLabel });
      }),
    ];
    return () => {
      for (const subscription of subscriptions) {
        subscription.remove();
      }
    };
  }, [mod, on, slotLabel, state]);

  if (state.status === 'failed') {
    return <AdMobBanner on={on} slot={slot} />;
  }

  // Banner-sized skeleton, same footprint as the loaded row, so the request
  // resolving never shifts anything below this slot.
  if (state.status !== 'loaded' || !mod) {
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.outline }]}>
        <View style={styles.row}>
          <Skeleton width={32} height={32} rounded="sm" />
          <View style={styles.textCol}>
            <Skeleton height={9} width="35%" />
            <Skeleton height={12} width="75%" style={{ marginTop: 2 }} />
          </View>
          <Skeleton width={48} height={20} rounded="sm" />
        </View>
      </View>
    );
  }

  const { ad } = state;
  const { NativeAdView, NativeAsset, NativeAssetType } = mod;

  return (
    // Zero padding/border on the outer chrome that touches NativeAdView — see
    // the identical warning in AdMobNativeAd.native.tsx.
    <View style={[styles.card, { backgroundColor: theme.surfaceVariant, borderColor: theme.outline }]}>
      <NativeAdView key={ad.responseId} nativeAd={ad} style={[styles.adView, adViewSize]}>
        <View style={styles.row} onLayout={onAdContentLayout}>
          {ad.icon?.url ? (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image
                source={{ uri: ad.icon.url }}
                style={styles.icon}
                accessibilityIgnoresInvertColors
              />
            </NativeAsset>
          ) : null}

          <View style={styles.textCol}>
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <Text style={[styles.badgeText, { color: theme.onPrimary }]}>
                {t('transitAdLabel')}
              </Text>
            </View>
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={[styles.headline, { color: theme.text }]} numberOfLines={1}>
                {ad.headline}
              </Text>
            </NativeAsset>
          </View>

          {ad.callToAction ? (
            <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
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
    borderWidth: 1,
    padding: space.xs,
  },
  adView: { width: '100%' },
  // paddingRight reserves the top-right corner for the AdChoices overlay the
  // SDK auto-inserts on a backfill fill (react-native-google-mobile-ads docs,
  // "AdChoices overlay": "leave space in your preferred corner ... for the
  // automatically inserted AdChoices logo"). Without it the CTA sits flush
  // against that corner and collides with the icon on backfill fills only —
  // which is why this failed Google's Ad Inspector intermittently rather than
  // every time.
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: space.xl },
  icon: { width: 32, height: 32, borderRadius: radius.sm },
  textCol: { flex: 1, gap: 2 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.xs,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  badgeText: { ...typography.overline, fontSize: 9, letterSpacing: 0.8 },
  headline: { ...typography.caption, fontWeight: '700' },
  cta: {
    ...typography.caption,
    textAlign: 'center',
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
  },
});
