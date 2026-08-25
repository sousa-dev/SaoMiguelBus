import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { getAdMobModule } from '@/features/ads/lib/admob-native';
import { getAdMobBannerUnitId } from '@/config/admob';
import { track } from '@/lib/analytics';
import { radius, space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  on: string;
  slot?: string | number;
};

export function AdMobBanner({ on, slot }: Props) {
  const theme = useAppTheme();
  const unitId = getAdMobBannerUnitId();
  const mod = getAdMobModule();

  useEffect(() => {
    if (!unitId || !mod) {
      return;
    }
    track('transit', 'ad_mob_banner_impression', { on, slot: String(slot ?? 'top') });
  }, [mod, on, slot, unitId]);

  if (!unitId || !mod) {
    return null;
  }

  const { BannerAd, BannerAdSize } = mod;

  return (
    <View style={[styles.wrap, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdOpened={() => {
          track('transit', 'ad_mob_banner_click', { on, slot: String(slot ?? 'top') });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    paddingVertical: space.xs,
  },
});
