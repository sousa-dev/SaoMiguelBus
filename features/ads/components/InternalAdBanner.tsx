import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight, Crown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { InternalAdCreative } from '@/features/ads/lib/internal-ads/types';
import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { track } from '@/lib/analytics';
import { getModule } from '@/lib/modules';
import { radius, space, typography } from '@/lib/tokens';

type Props = {
  creative: InternalAdCreative;
  on: string;
  slot?: string | number;
};

export function InternalAdBanner({ creative, on, slot = 'top' }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { openPaywall } = usePaywall();

  const module = creative.moduleKey ? getModule(creative.moduleKey) : undefined;
  const TitleIcon: LucideIcon = creative.kind === 'paywall' ? Crown : (module?.Icon ?? Crown);

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
      void openPaywall('internal_ad_banner');
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
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{t('transitAdLabel')}</Text>
      </View>

      <View style={styles.iconWrap}>
        <TitleIcon size={18} color="#FFFFFF" strokeWidth={2.5} />
      </View>

      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {t(creative.titleKey)}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {t(creative.subtitleKey)}
        </Text>
      </View>

      <ChevronRight size={18} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: space.sm,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
    borderTopRightRadius: radius.md,
    borderBottomLeftRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  badgeText: { ...typography.overline, fontSize: 8, letterSpacing: 0.6, color: 'rgba(255,255,255,0.85)' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, gap: 1 },
  title: {
    ...typography.label,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  subtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
});
