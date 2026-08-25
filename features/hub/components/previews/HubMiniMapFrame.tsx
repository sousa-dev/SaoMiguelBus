import type { ReactNode } from 'react';
import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';

import { radius, space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type HubMiniMapFrameProps = {
  height?: number;
  /** Raster background (PNG). */
  imageSource?: ImageSourcePropType;
  /** Vector background (SVG component from metro svg import). */
  vectorBackground?: ReactNode;
  /** Marker overlay; use the same viewBox / percentage space as the asset. */
  overlay: ReactNode;
};

/** Full-width map slot: background scales to the frame, markers sit on top. */
export function HubMiniMapFrame({
  height = 72,
  imageSource,
  vectorBackground,
  overlay,
}: HubMiniMapFrameProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          height,
          backgroundColor: theme.card,
          borderRadius: radius.md,
        },
      ]}
      accessibilityElementsHidden
    >
      {imageSource ? (
        <Image source={imageSource} style={styles.media} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : null}
      {vectorBackground ? <View style={styles.media}>{vectorBackground}</View> : null}
      <View style={styles.overlay} pointerEvents="none">
        {overlay}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    marginBottom: space.sm,
    position: 'relative',
  },
  media: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
});
