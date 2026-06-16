import type { LucideIcon } from 'lucide-react-native';
import { Bus, Crown, Hand, MapPin, Star } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { track } from '@/lib/analytics';
import { canShowFirstPartyAds } from '@/lib/consent-store';
import { useNetwork } from '@/lib/network-provider';
import { usePremium } from '@/lib/premium-store';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type CtaVariant = {
  id: string;
  backgroundColor: string;
  Icon: LucideIcon;
  titleKey: string;
  subtitleKey: string;
  hintKey: string;
  hintIcon: LucideIcon;
};

const VARIANTS: CtaVariant[] = [
  {
    id: 'remove-ads',
    backgroundColor: '#F59E0B',
    Icon: Crown,
    titleKey: 'removeAdsTitle',
    subtitleKey: 'clickToRemoveAds',
    hintKey: 'clickToRemoveAds',
    hintIcon: Hand,
  },
  {
    id: 'tired-of-ads',
    backgroundColor: '#A855F7',
    Icon: Star,
    titleKey: 'tiredOfAdsTitle',
    subtitleKey: 'upgradeNowButton',
    hintKey: 'clickToRemoveAds',
    hintIcon: Hand,
  },
  {
    id: 'track-buses',
    backgroundColor: '#14B8A6',
    Icon: Bus,
    titleKey: 'trackBusesTitle',
    subtitleKey: 'realTimeTrackingText',
    hintKey: 'unlockTrackingText',
    hintIcon: Crown,
  },
  {
    id: 'pin-routes',
    backgroundColor: '#10B981',
    Icon: MapPin,
    titleKey: 'pinRoutesTitle',
    subtitleKey: 'dailyTrackingText',
    hintKey: 'unlockButton',
    hintIcon: Crown,
  },
];

const ROTATE_MS = 30_000;

/** Hidden for now — top `AdBanner` + internal fallback cover the same upsell surface. */
export const PREMIUM_SEARCH_CTA_ENABLED = false;

function randomVariantIndex(): number {
  return Math.floor(Math.random() * VARIANTS.length);
}

/**
 * Premium upsell strip above the transit search form — webapp `homeAdBanner` /
 * `routesAdBanner` parity. Rotates copy every 30s and opens the paywall on tap.
 */
export function PremiumSearchCta() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isPremium = usePremium();
  const { isOnline } = useNetwork();
  const { openPaywall } = usePaywall();
  const [index, setIndex] = useState(randomVariantIndex);

  const show =
    PREMIUM_SEARCH_CTA_ENABLED && canShowFirstPartyAds(isPremium) && isOnline;

  useEffect(() => {
    if (!show) {
      return;
    }
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % VARIANTS.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [show]);

  if (!show) {
    return null;
  }

  const variant = VARIANTS[index]!;
  const HintIcon = variant.hintIcon;
  const TitleIcon = variant.Icon;

  const onPress = () => {
    track('transit', 'premium_search_cta_click', { variant: variant.id });
    void openPaywall();
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t(variant.titleKey)}. ${t(variant.subtitleKey)}`}
      accessibilityHint={t('clickToRemoveAds')}
      style={({ pressed }) => [
        styles.wrap,
        { backgroundColor: variant.backgroundColor, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: theme.primary }]}>
        <Text style={[styles.badgeText, { color: theme.onPrimary }]}>{t('transitAdLabel')}</Text>
      </View>

      <View style={styles.titleRow}>
        <TitleIcon size={20} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={styles.title}>{t(variant.titleKey)}</Text>
      </View>

      <Text style={styles.subtitle}>{t(variant.subtitleKey)}</Text>

      <View style={styles.hintRow}>
        <HintIcon size={12} color="rgba(255,255,255,0.85)" strokeWidth={2} />
        <Text style={styles.hint}>{t(variant.hintKey)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
    borderBottomRightRadius: radius.sm,
    zIndex: 1,
  },
  badgeText: { ...typography.overline, fontSize: 9, letterSpacing: 0.8 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.xs,
  },
  title: {
    ...typography.label,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    textAlign: 'center',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: space.sm,
  },
  hint: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
});
