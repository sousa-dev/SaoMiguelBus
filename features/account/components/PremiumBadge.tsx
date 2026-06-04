import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { usePremium } from '@/lib/premium-store';
import { useAppTheme } from '@/lib/theme';
import { radius, space, typography } from '@/lib/tokens';

type Props = {
  /** Render nothing for non-premium users (default). When false, never renders. */
  showWhenFree?: boolean;
};

/** Compact "Premium" pill shown when the current user has an active entitlement. */
export function PremiumBadge({ showWhenFree = false }: Props) {
  const theme = useAppTheme();
  const isPremium = usePremium();

  if (!isPremium && !showWhenFree) return null;

  return (
    <View style={[styles.pill, { backgroundColor: theme.accent }]}>
      <Sparkles size={12} color={theme.onAccent} />
      <Text style={[typography.caption, styles.label, { color: theme.onAccent }]}>Premium</Text>
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
