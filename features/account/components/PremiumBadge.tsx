import { Sparkles } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useEntitlement } from '@/features/account/hooks/useEntitlement';
import { isTouristPassEntitlement } from '@/features/premium/lib/is-tourist-pass-entitlement';
import { getPremiumDaysRemaining } from '@/features/premium/lib/premium-time-remaining';
import { usePremium } from '@/lib/premium-store';
import { useAppTheme } from '@/lib/theme';
import { radius, space, typography } from '@/lib/tokens';

type Props = {
  /** Render nothing for non-premium users (default). When false, never renders. */
  showWhenFree?: boolean;
};

const BADGE_COUNTDOWN_REFRESH_MS = 60 * 60 * 1000;

/** Compact "Premium" pill shown when the current user has an active entitlement. */
export function PremiumBadge({ showWhenFree = false }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isPremium = usePremium();
  const entitlement = useEntitlement();
  const [, setCountdownTick] = useState(0);

  const isTouristPass = isTouristPassEntitlement(entitlement);
  const daysRemaining = getPremiumDaysRemaining(entitlement?.currentPeriodEnd);

  useEffect(() => {
    if (!isTouristPass || daysRemaining <= 0) {
      return;
    }
    const timer = setInterval(() => setCountdownTick((n) => n + 1), BADGE_COUNTDOWN_REFRESH_MS);
    return () => clearInterval(timer);
  }, [isTouristPass, daysRemaining, entitlement?.currentPeriodEnd]);

  if (!isPremium && !showWhenFree) return null;

  const label =
    isTouristPass && daysRemaining > 0
      ? t('premiumBadgeDaysLeft', { count: daysRemaining })
      : 'Premium';

  return (
    <View style={[styles.pill, { backgroundColor: theme.accent }]}>
      <Sparkles size={12} color={theme.onAccent} />
      <Text style={[typography.caption, styles.label, { color: theme.onAccent }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  label: { fontWeight: '700' },
});
