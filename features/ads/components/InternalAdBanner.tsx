import type { LucideIcon } from 'lucide-react-native';
import { Crown, Hand } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { InternalAdCreative } from '@/features/ads/lib/internal-ads/types';
import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { track } from '@/lib/analytics';
import { getModule } from '@/lib/modules';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  creative: InternalAdCreative;
  on: string;
  slot?: string | number;
};

export function InternalAdBanner({ creative, on, slot = 'top' }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { openPaywall } = usePaywall();

  const module = creative.moduleKey ? getModule(creative.moduleKey) : undefined;
  const TitleIcon: LucideIcon = creative.kind === 'paywall' ? Crown : (module?.Icon ?? Crown);
  const HintIcon: LucideIcon = creative.kind === 'paywall' ? Hand : (module?.Icon ?? Crown);

  useEffect(() => {
    track('transit', 'internal_ad_impression', {
      on,
      slot,
      creativeId: creative.id,
      kind: creative.kind,
      moduleKey: creative.moduleKey,
      surface: 'banner',
    });
  }, [creative.id, creative.kind, creative.moduleKey, on, slot]);

  const onPress = () => {
    track('transit', 'internal_ad_click', {
      on,
      slot,
      creativeId: creative.id,
      kind: creative.kind,
      moduleKey: creative.moduleKey,
      surface: 'banner',
    });

    if (creative.kind === 'paywall') {
      void openPaywall();
      return;
    }

    if (module?.route) {
      router.push(module.route);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t(creative.titleKey)}. ${t(creative.subtitleKey)}`}
      style={({ pressed }) => [
        styles.wrap,
        { backgroundColor: creative.backgroundColor, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: theme.primary }]}>
        <Text style={[styles.badgeText, { color: theme.onPrimary }]}>{t('transitAdLabel')}</Text>
      </View>

      <View style={styles.titleRow}>
        <TitleIcon size={20} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={styles.title}>{t(creative.titleKey)}</Text>
      </View>

      <Text style={styles.subtitle}>{t(creative.subtitleKey)}</Text>

      {creative.hintKey ? (
        <View style={styles.hintRow}>
          <HintIcon size={12} color="rgba(255,255,255,0.85)" strokeWidth={2} />
          <Text style={styles.hint}>{t(creative.hintKey)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: radius.md,
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
    justifyContent: 'center',
    gap: space.sm,
    marginBottom: space.xs,
    width: '100%',
  },
  title: {
    ...typography.label,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    flexShrink: 1,
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
    justifyContent: 'center',
    gap: 4,
    marginTop: space.sm,
    width: '100%',
  },
  hint: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
});
