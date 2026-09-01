import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { getAdMobModule } from '@/features/ads/lib/admob-native';
import { getAdMobBannerUnitId } from '@/config/admob';
import { track } from '@/lib/analytics';
import { space } from '@/lib/tokens';

type Props = {
  on: string;
  slot?: string | number;
};

/**
 * AdMob banner rendered at its container's real width.
 *
 * Adaptive banners default to the full device width, so the frame must never be
 * inset, rounded or clipped around them — cropping any part of a Google ad (or its
 * "Ad" attribution) is a policy violation. We measure the slot and hand the width
 * to the SDK instead, and keep the wrapper free of borderRadius/overflow.
 */
export function AdMobBanner({ on, slot }: Props) {
  const unitId = getAdMobBannerUnitId();
  const mod = getAdMobModule();
  const [width, setWidth] = useState(0);

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

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    setWidth((current) => (current === next ? current : next));
  };

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {width > 0 ? (
        <BannerAd
          unitId={unitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          width={width}
          onAdOpened={() => {
            track('transit', 'ad_mob_banner_click', { on, slot: String(slot ?? 'top') });
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: space.xs,
  },
});
