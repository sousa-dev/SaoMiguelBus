import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Crown } from 'lucide-react-native';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { withAlpha } from '@/lib/color-utils';
import { usePremium } from '@/lib/premium-store';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export function PremiumHeaderButton() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const router = useRouter();
  const isPremium = usePremium();
  const { openPaywall } = usePaywall();

  const label = isPremium ? t('premiumHeaderButtonActive') : t('removeAdsButton');
  const iconColor = isPremium ? theme.onAccent : theme.accent;
  const textColor = iconColor;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isPremium }}
      onPress={() => {
        if (Platform.OS !== 'web') {
          void Haptics.selectionAsync();
        }
        if (isPremium) {
          router.push('/settings');
        } else {
          void openPaywall('header');
        }
      }}
      style={({ pressed }) => [
        styles.pill,
        isPremium ? styles.pillActive : styles.pillUpsell,
        isPremium
          ? {
              backgroundColor: theme.accent,
              borderColor: withAlpha(theme.onAccent, 0.12),
            }
          : {
              backgroundColor: withAlpha(theme.accent, theme.isDark ? 0.18 : 0.1),
              borderColor: theme.accent,
            },
        { opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <Crown
        size={iconSize.sm}
        color={iconColor}
        strokeWidth={2.25}
        fill={isPremium ? withAlpha(theme.onAccent, 0.25) : 'transparent'}
      />
      <Text style={[typography.caption, styles.label, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
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
    marginLeft: space.xs,
  },
  pillActive: { borderWidth: StyleSheet.hairlineWidth },
  pillUpsell: { borderWidth: 1 },
  label: { fontWeight: '700', letterSpacing: 0.3 },
});
