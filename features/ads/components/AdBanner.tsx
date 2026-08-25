import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AdMobBanner } from '@/features/ads/components/AdMobBanner';
import { InternalAdBanner } from '@/features/ads/components/InternalAdBanner';
import { useAd } from '@/features/ads/hooks/useAd';
import { track } from '@/lib/analytics';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  /** Compat slot: `home` for search surfaces, `routes` for directions. */
  on: string;
  /** Distinguishes multiple banners on the same surface (separate rotation). */
  slot?: string | number;
};

/**
 * Hybrid SMB banner: first-party image → AdMob → internal fallback.
 * Renders nothing for premium users or when no tier has fill.
 */
export function AdBanner({ on, slot }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { kind, ad, internalCreative, openAd } = useAd(on, slot);
  const [aspectRatio, setAspectRatio] = useState(4);

  useEffect(() => {
    if (kind !== 'first-party' || !ad?.media) {
      return;
    }
    let cancelled = false;
    Image.getSize(
      ad.media,
      (width, height) => {
        if (!cancelled && width > 0 && height > 0) {
          setAspectRatio(width / height);
        }
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [ad?.media, kind]);

  useEffect(() => {
    if (kind !== 'first-party' || ad?.id == null) {
      return;
    }
    track('transit', 'ad_impression', { on, adId: ad.id });
  }, [ad?.id, kind, on]);

  if (kind === 'admob') {
    return <AdMobBanner on={on} slot={slot} />;
  }

  if (kind === 'internal' && internalCreative) {
    return <InternalAdBanner creative={internalCreative} on={on} slot={slot} />;
  }

  if (kind !== 'first-party' || !ad) {
    return null;
  }

  return (
    <Pressable
      onPress={openAd}
      accessibilityRole="link"
      accessibilityLabel={ad.entity || t('transitAdLabel')}
      accessibilityHint={t('transitAdAccessibilityHint')}
      style={[styles.wrap, { borderColor: theme.border, backgroundColor: theme.card }]}
    >
      <View style={[styles.badge, { backgroundColor: theme.primary }]}>
        <Text style={[styles.badgeText, { color: theme.onPrimary }]}>{t('transitAdLabel')}</Text>
      </View>
      <Image
        source={{ uri: ad.media }}
        style={[styles.image, { aspectRatio }]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
    borderBottomRightRadius: radius.sm,
  },
  badgeText: { ...typography.overline, fontSize: 9, letterSpacing: 0.8 },
  image: { width: '100%' },
});
