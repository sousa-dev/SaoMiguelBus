import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Map as MapIcon } from 'lucide-react-native';

import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

/**
 * Way into the browsable network map.
 *
 * Rendered only where geometry exists (AzoresBus). On legacy the transit screen
 * is byte-for-byte what it was, because a map there would have nothing to draw.
 */
export function TransitMapLinks() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/transit/network')}
      accessibilityRole="button"
      style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={[styles.icon, { backgroundColor: theme.primary }]}>
        <MapIcon size={18} color={theme.onPrimary} />
      </View>
      <Text style={[typography.label, { color: theme.text, flex: 1 }]}>
        {t('transitNetworkMap')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
