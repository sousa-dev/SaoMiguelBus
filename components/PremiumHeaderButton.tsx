import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Crown } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PremiumLaunchModal } from '@/features/transit/components/PremiumLaunchModal';
import { withAlpha } from '@/lib/color-utils';
import { usePremium } from '@/lib/premium-store';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export function PremiumHeaderButton() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const router = useRouter();
  const isPremium = usePremium();
  const [open, setOpen] = useState(false);

  const label = isPremium ? t('premiumHeaderButtonActive') : t('premiumHeaderButton');

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          if (Platform.OS !== 'web') {
            void Haptics.selectionAsync();
          }
          if (isPremium) {
            router.push('/settings');
          } else {
            setOpen(true);
          }
        }}
        style={({ pressed }) => [
          styles.pill,
          {
            backgroundColor: theme.accent,
            borderColor: withAlpha(theme.onAccent, 0.12),
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <Crown size={iconSize.sm} color={theme.onAccent} strokeWidth={2.25} fill={withAlpha(theme.onAccent, 0.2)} />
        <Text style={[typography.caption, styles.label, { color: theme.onAccent }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
      <PremiumLaunchModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    marginLeft: space.xs,
  },
  label: { fontWeight: '700', letterSpacing: 0.3 },
});
