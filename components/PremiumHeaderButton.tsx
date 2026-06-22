import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Clock, Crown, Sparkles } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, type TextStyle, View } from 'react-native';
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

/** Keep the transit header pill narrow enough to avoid iOS nav-bar overflow ("…" menu). */
const HEADER_PILL_MAX_WIDTH = 112;
const COMPACT_HEADER_LABEL_MAX_LENGTH = 12;

function resolveHeaderDisplayLabel(fullLabel: string, compactLabel: string): string {
  return fullLabel.length > COMPACT_HEADER_LABEL_MAX_LENGTH ? compactLabel : fullLabel;
}

function resolveHeaderPillLabelStyle(label: string): TextStyle {
  const length = label.length;
  if (length <= 10) {
    return { ...typography.caption, fontWeight: '700', letterSpacing: 0.3 };
  }
  if (length <= 16) {
    return { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.2 };
  }
  return { fontSize: 10, lineHeight: 13, fontWeight: '700', letterSpacing: 0.1 };
}

function resolveHeaderPillPadding(label: string) {
  if (label.length <= 10) {
    return { paddingHorizontal: space.sm, paddingVertical: 6 };
  }
  return { paddingHorizontal: space.xs, paddingVertical: 5 };
}

function HeaderPillLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text
      style={[resolveHeaderPillLabelStyle(label), styles.label, { color }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.82}
    >
      {label}
    </Text>
  );
}

/** Header pill only — modal lives in {@link AdFreeRewardModalHost}. */
export function PremiumHeaderButton() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const router = useRouter();
  const isPremium = usePremium();
  const { openPaywall } = usePaywall();
  const { isAdFreeActive, remainingMs } = useAdFreeWindow();
  const { openModal, openStatusModal, isRewardOfferAvailable } = useRewardedAdFree('header');
  const compactLabel = t('premiumHeaderButton');

  useEffect(() => {
    if (!isPremium && !isAdFreeActive && isRewardOfferAvailable) {
      track('ads', 'reward_header_impression', { source: 'transit_header' });
    }
  }, [isAdFreeActive, isPremium, isRewardOfferAvailable]);

  if (isPremium) {
    const label = t('premiumHeaderButtonActive');
    const displayLabel = resolveHeaderDisplayLabel(label, compactLabel);
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
          resolveHeaderPillPadding(displayLabel),
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
        <HeaderPillLabel label={displayLabel} color={textColor} />
      </Pressable>
    );
  }

  if (isAdFreeActive) {
    const label = t('adsAdFreeStatusRemaining', { minutes: formatRemainingMinutes(remainingMs) });
    const displayLabel = resolveHeaderDisplayLabel(label, compactLabel);
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
          openStatusModal();
        }}
        style={({ pressed }) => [
          styles.pill,
          styles.pillUpsell,
          resolveHeaderPillPadding(displayLabel),
          {
            backgroundColor: withAlpha(theme.accent, theme.isDark ? 0.18 : 0.1),
            borderColor: theme.accent,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <Clock size={iconSize.sm} color={iconColor} strokeWidth={2.25} />
        <HeaderPillLabel label={displayLabel} color={textColor} />
      </Pressable>
    );
  }

  if (isRewardOfferAvailable) {
    const label = t('removeAdsButton');
    const displayLabel = resolveHeaderDisplayLabel(label, compactLabel);
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
            resolveHeaderPillPadding(displayLabel),
            {
              backgroundColor: withAlpha(theme.accent, theme.isDark ? 0.18 : 0.1),
              borderColor: theme.accent,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Sparkles size={iconSize.sm} color={iconColor} strokeWidth={2.25} />
          <HeaderPillLabel label={displayLabel} color={textColor} />
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
  const displayLabel = resolveHeaderDisplayLabel(label, compactLabel);
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
        resolveHeaderPillPadding(displayLabel),
        {
          backgroundColor: withAlpha(theme.accent, theme.isDark ? 0.18 : 0.1),
          borderColor: theme.accent,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <Crown size={iconSize.sm} color={iconColor} strokeWidth={2.25} />
      <HeaderPillLabel label={displayLabel} color={textColor} />
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
    borderRadius: radius.full,
    marginLeft: space.xs,
    flexShrink: 1,
    maxWidth: HEADER_PILL_MAX_WIDTH,
    minWidth: 0,
  },
  pillWithBadge: {
    paddingRight: space.sm,
  },
  pillActive: { borderWidth: StyleSheet.hairlineWidth },
  pillUpsell: { borderWidth: 1 },
  label: { flexShrink: 1 },
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
