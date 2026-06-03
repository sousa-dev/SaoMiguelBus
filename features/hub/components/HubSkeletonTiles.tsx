import { StyleSheet, View } from 'react-native';

import { radius, space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type HubSkeletonTilesProps = {
  count?: number;
  columns?: number;
};

export function HubSkeletonTiles({ count = 6, columns = 2 }: HubSkeletonTilesProps) {
  const theme = useAppTheme();
  const listMode = columns === 1;

  return (
    <View style={styles.wrap}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            styles.tile,
            listMode ? styles.tileList : columns === 3 ? styles.tileThird : styles.tileHalf,
            { backgroundColor: theme.surfaceVariant },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: space.md,
    gap: space.md,
  },
  tile: {
    aspectRatio: 1,
    borderRadius: radius.lg,
    minHeight: 96,
  },
  tileHalf: {
    width: '47%',
  },
  tileThird: {
    width: '30%',
  },
  tileList: {
    width: '100%',
    aspectRatio: undefined,
    height: 72,
  },
});
