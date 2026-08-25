import { StyleSheet, Text, View } from 'react-native';

import { typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type TabBarBadgeProps = {
  count: number;
};

export function TabBarBadge({ count }: TabBarBadgeProps) {
  const theme = useAppTheme();
  if (count <= 0) {
    return null;
  }

  const label = count > 99 ? '99+' : String(count);

  return (
    <View style={[styles.badge, { backgroundColor: theme.danger }]} accessibilityLabel={label}>
      <Text style={[typography.caption, styles.text, { color: theme.onDanger }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});
