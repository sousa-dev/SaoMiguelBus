import { Platform, StyleSheet, Text } from 'react-native';

import { mapTileAttribution } from '@/lib/map-tiles';
import { typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  isDark?: boolean;
};

export function MapAttribution({ isDark }: Props) {
  const theme = useAppTheme();
  const dark = isDark ?? false;

  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <Text style={[styles.credit, typography.caption, { color: theme.muted }]}>
      {mapTileAttribution(dark)}
    </Text>
  );
}

const styles = StyleSheet.create({
  credit: { fontSize: 10, marginTop: 4 },
});
