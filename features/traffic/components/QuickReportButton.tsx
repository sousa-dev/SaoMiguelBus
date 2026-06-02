import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { AppTheme } from '@/lib/theme';

export function QuickReportButton({
  theme,
  onPress,
  disabled,
}: {
  theme: AppTheme;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.fab, { backgroundColor: theme.primary, opacity: disabled ? 0.5 : 1 }]}
    >
      <Text style={styles.icon}>＋</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  icon: { color: '#fff', fontSize: 34, lineHeight: 38, fontWeight: '700' },
});
