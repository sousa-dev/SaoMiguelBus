import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Clock, Crown, Sparkles } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAdFreeWindow } from '@/features/ads/hooks/useAdFreeWindow';
import { useRewardedAdFree } from '@/features/ads/hooks/useRewardedAdFree';
import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { track } from '@/lib/analytics';
import { withAlpha } from '@/lib/color-utils';
import { usePremium } from '@/lib/premium-store';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

function formatRemainingMinutes(remainingMs: number): number {
  return Math.max(1, Math.ceil(remainingMs / 60_000));
}

/** Header pill only — modal lives in {@link AdFreeRewardModalHost}. */
export function PremiumHeaderButton() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const router = useRouter();
  const isPremium = usePremium();
  const { openPaywall } = usePaywall();
  const { isAdFreeActive, remainingMs } = useAdFreeWindow();
  const { openModal, isRewardOfferAvailable } = useRewardedAdFree('header');

  useEffect(() => {
    if (!isPremium && !isAdFreeActive && isRewardOfferAvailable) {
      track('ads', 'reward_header_impression', { source: 'transit_header' });
    }
  }, [isAdFreeActive, isPremium, isRewardOfferAvailable]);

  if (isPremium) {
    const label = t('premiumHeaderButtonActive');
    const iconColor = theme.onAccent;
    const textColor = iconColor;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: true }}
        onPress={() => {
          if (Platform.OS !== 'web') {
            void Haptics.selectionAsync();
          }
          router.push('/settings');
        }}
        style={({ pressed }) => [
          styles.pill,
          styles.pillActive,
          {
            backgroundColor: theme.accent,
            borderColor: withAlpha(theme.onAccent, 0.12),
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <Crown
          size={iconSize.sm}
          color={iconColor}
          strokeWidth={2.25}
          fill={withAlpha(theme.onAccent, 0.25)}
        />
        <Text style={[typography.caption, styles.label, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );
  }

  if (isAdFreeActive) {
    const label = t('adsAdFreeStatusRemaining', { minutes: formatRemainingMinutes(remainingMs) });
    const iconColor = theme.accent;
    const textColor = iconColor;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={!isRewardOfferAvailable}
        onPress={() => {
          if (!isRewardOfferAvailable) {
            return;
          }
          if (Platform.OS !== 'web') {
            void Haptics.selectionAsync();
          }
          openModal();
        }}
        style={({ pressed }) => [
          styles.pill,
          styles.pillUpsell,
          {
            backgroundColor: withAlpha(theme.accent, theme.isDark ? 0.18 : 0.1),
            borderColor: theme.accent,
            opacity: pressed && isRewardOfferAvailable ? 0.88 : 1,
          },
        ]}
      >
        <Clock size={iconSize.sm} color={iconColor} strokeWidth={2.25} />
        <Text style={[typography.caption, styles.label, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );
  }

  if (isRewardOfferAvailable) {
    const label = t('removeAdsButton');
    const freeBadge = t('adsAdFreeSidebarBadge');
    const iconColor = theme.accent;
    const textColor = iconColor;

    return (
      <View style={styles.pillWrap} accessibilityElementsHidden>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${freeBadge}`}
          onPress={() => {
            if (Platform.OS !== 'web') {
              void Haptics.selectionAsync();
            }
            openModal();
          }}
          style={({ pressed }) => [
            styles.pill,
            styles.pillUpsell,
            styles.pillWithBadge,
            {
              backgroundColor: withAlpha(theme.accent, theme.isDark ? 0.18 : 0.1),
              borderColor: theme.accent,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Sparkles size={iconSize.sm} color={iconColor} strokeWidth={2.25} />
          <Text style={[typography.caption, styles.label, { color: textColor }]} numberOfLines={1}>
            {label}
          </Text>
        </Pressable>
        <View
          style={[styles.cornerBadge, { backgroundColor: theme.accent, borderColor: theme.surface }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={[styles.cornerBadgeText, { color: theme.onAccent }]}>{freeBadge}</Text>
        </View>
      </View>
    );
  }

  const label = t('removeAdsButton');
  const iconColor = theme.accent;
  const textColor = iconColor;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        if (Platform.OS !== 'web') {
          void Haptics.selectionAsync();
        }
        void openPaywall('header');
      }}
      style={({ pressed }) => [
        styles.pill,
        styles.pillUpsell,
        {
          backgroundColor: withAlpha(theme.accent, theme.isDark ? 0.18 : 0.1),
          borderColor: theme.accent,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <Crown size={iconSize.sm} color={iconColor} strokeWidth={2.25} />
      <Text style={[typography.caption, styles.label, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pillWrap: {
    position: 'relative',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginLeft: space.xs,
    flexShrink: 1,
  },
  pillWithBadge: {
    paddingRight: space.md,
  },
  pillActive: { borderWidth: StyleSheet.hairlineWidth },
  pillUpsell: { borderWidth: 1 },
  label: { fontWeight: '700', letterSpacing: 0.3 },
  cornerBadge: {
    position: 'absolute',
    top: -5,
    right: -2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.sm,
    borderWidth: 1.5,
  },
  cornerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
});
