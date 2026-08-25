import { StyleSheet, View, type ViewStyle } from 'react-native';

import { radius, space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type SkeletonProps = {
  height?: number;
  width?: number | `${number}%`;
  style?: ViewStyle;
  rounded?: keyof typeof radius;
};

export function Skeleton({ height = 14, width = '100%', style, rounded = 'sm' }: SkeletonProps) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        {
          height,
          width,
          borderRadius: radius[rounded],
          backgroundColor: theme.surfaceVariant,
        },
        style,
      ]}
    />
  );
}

export function CardSkeleton({ imageHeight = 120 }: { imageHeight?: number }) {
  return (
    <View style={styles.card}>
      <Skeleton height={imageHeight} rounded="lg" />
      <Skeleton height={18} width="80%" style={{ marginTop: space.md }} />
      <Skeleton height={14} width="55%" style={{ marginTop: space.sm }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.md },
});
