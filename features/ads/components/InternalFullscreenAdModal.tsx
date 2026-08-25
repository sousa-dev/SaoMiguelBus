import type { LucideIcon } from 'lucide-react-native';
import { Crown, Hand } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ModalSafeArea } from '@/components/ui/ModalSafeArea';
import { INTERNAL_AD_CLOSE_DELAY_SEC } from '@/features/ads/lib/internal-ad-constants';
import type { InternalAdCreative, InternalAdSurface } from '@/features/ads/lib/internal-ads/types';
import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { track } from '@/lib/analytics';
import { getModule } from '@/lib/modules';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
  creative: InternalAdCreative;
  surface: InternalAdSurface;
  onDismiss: () => void;
};

export function InternalFullscreenAdModal({ visible, creative, surface, onDismiss }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { openPaywall } = usePaywall();
  const [secondsLeft, setSecondsLeft] = useState(INTERNAL_AD_CLOSE_DELAY_SEC);

  const module = creative.moduleKey ? getModule(creative.moduleKey) : undefined;
  const TitleIcon: LucideIcon = creative.kind === 'paywall' ? Crown : (module?.Icon ?? Crown);
  const HintIcon: LucideIcon = creative.kind === 'paywall' ? Hand : (module?.Icon ?? Crown);
  const canClose = secondsLeft <= 0;
  const isInterstitial = surface === 'interstitial';

  useEffect(() => {
    if (!visible) {
      setSecondsLeft(INTERNAL_AD_CLOSE_DELAY_SEC);
      return;
    }

    track('transit', 'internal_ad_impression', {
      creativeId: creative.id,
      kind: creative.kind,
      moduleKey: creative.moduleKey,
      surface,
    });

    setSecondsLeft(INTERNAL_AD_CLOSE_DELAY_SEC);
    const interval = setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [visible, creative.id, creative.kind, creative.moduleKey, surface]);

  const onPrimaryPress = () => {
    track('transit', 'internal_ad_click', {
      creativeId: creative.id,
      kind: creative.kind,
      moduleKey: creative.moduleKey,
      surface,
    });

    if (creative.kind === 'paywall') {
      onDismiss();
      void openPaywall('internal_fullscreen_ad');
      return;
    }

    if (module?.route) {
      onDismiss();
      router.push(module.route);
    }
  };

  if (isInterstitial) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={canClose ? onDismiss : undefined}
      >
        <View style={[styles.fullscreen, { backgroundColor: creative.backgroundColor }]}>
          <ModalSafeArea style={styles.fullscreenSafe}>
            <View style={styles.fullscreenHeader}>
              <View style={[styles.adBadge, { backgroundColor: theme.primary }]}>
                <Text style={[styles.adBadgeText, { color: theme.onPrimary }]}>{t('transitAdLabel')}</Text>
              </View>
              <Pressable
                onPress={canClose ? onDismiss : undefined}
                disabled={!canClose}
                accessibilityRole="button"
                accessibilityLabel={canClose ? t('close') : t('internalAdCloseInSeconds', { seconds: secondsLeft })}
                style={styles.fullscreenCloseBtn}
              >
                <Text style={styles.fullscreenCloseText}>
                  {canClose ? '×' : String(secondsLeft)}
                </Text>
              </Pressable>
            </View>

            <View style={styles.fullscreenContent}>
              <TitleIcon size={56} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.fullscreenTitle}>{t(creative.titleKey)}</Text>
              <Text style={styles.fullscreenSubtitle}>{t(creative.subtitleKey)}</Text>
              {creative.hintKey ? (
                <View style={styles.hintRow}>
                  <HintIcon size={16} color="rgba(255,255,255,0.85)" strokeWidth={2} />
                  <Text style={styles.hint}>{t(creative.hintKey)}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.fullscreenFooter}>
              {!canClose ? (
                <Text style={styles.fullscreenCountdown}>
                  {t('internalAdCloseInSeconds', { seconds: secondsLeft })}
                </Text>
              ) : null}

              <Pressable
                onPress={onPrimaryPress}
                style={[styles.fullscreenPrimaryBtn, { backgroundColor: theme.primary }]}
                accessibilityRole="button"
              >
                <Text style={[styles.fullscreenPrimaryBtnText, { color: theme.onPrimary }]}>
                  {creative.kind === 'paywall' ? t('upgradeNowButton') : t('internalAdExploreButton')}
                </Text>
              </Pressable>

              <Pressable
                onPress={canClose ? onDismiss : undefined}
                disabled={!canClose}
                accessibilityRole="button"
                style={styles.fullscreenSecondaryBtn}
              >
                <Text style={styles.fullscreenSecondaryBtnText}>{t('continueWithAdsButton')}</Text>
              </Pressable>
            </View>
          </ModalSafeArea>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={canClose ? onDismiss : undefined}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Pressable
            onPress={canClose ? onDismiss : undefined}
            disabled={!canClose}
            accessibilityRole="button"
            accessibilityLabel={canClose ? t('close') : t('internalAdCloseInSeconds', { seconds: secondsLeft })}
            style={styles.closeBtn}
          >
            <Text style={[styles.closeText, { color: canClose ? theme.muted : theme.border }]}>
              {canClose ? '×' : secondsLeft}
            </Text>
          </Pressable>

          <View style={[styles.hero, { backgroundColor: creative.backgroundColor }]}>
            <View style={styles.titleRow}>
              <TitleIcon size={28} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.heroTitle}>{t(creative.titleKey)}</Text>
            </View>
            <Text style={styles.heroSubtitle}>{t(creative.subtitleKey)}</Text>
            {creative.hintKey ? (
              <View style={styles.hintRow}>
                <HintIcon size={14} color="rgba(255,255,255,0.85)" strokeWidth={2} />
                <Text style={styles.hint}>{t(creative.hintKey)}</Text>
              </View>
            ) : null}
          </View>

          {!canClose ? (
            <Text style={[styles.countdown, { color: theme.muted }]}>
              {t('internalAdCloseInSeconds', { seconds: secondsLeft })}
            </Text>
          ) : null}

          <Pressable
            onPress={onPrimaryPress}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            accessibilityRole="button"
          >
            <Text style={[styles.primaryBtnText, { color: theme.onPrimary }]}>
              {creative.kind === 'paywall' ? t('upgradeNowButton') : t('internalAdExploreButton')}
            </Text>
          </Pressable>

          <Pressable
            onPress={canClose ? onDismiss : undefined}
            disabled={!canClose}
            accessibilityRole="button"
            style={styles.secondaryBtn}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.muted }]}>
              {t('continueWithAdsButton')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
  },
  fullscreenSafe: {
    flex: 1,
    paddingHorizontal: space.lg,
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adBadge: {
    paddingHorizontal: space.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  adBadgeText: { ...typography.overline, fontSize: 9, letterSpacing: 0.8 },
  fullscreenCloseBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenCloseText: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fullscreenContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
  },
  fullscreenTitle: {
    ...typography.title,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fullscreenSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
  },
  fullscreenFooter: {
    gap: space.sm,
    paddingBottom: space.md,
  },
  fullscreenCountdown: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: space.xs,
  },
  fullscreenPrimaryBtn: {
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  fullscreenPrimaryBtnText: {
    ...typography.label,
    fontSize: 16,
  },
  fullscreenSecondaryBtn: {
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  fullscreenSecondaryBtnText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: space.lg,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    gap: space.md,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: space.xs,
    minWidth: 32,
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '700',
  },
  hero: {
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.sm,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    width: '100%',
  },
  heroTitle: {
    ...typography.title,
    color: '#FFFFFF',
    fontSize: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  heroSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    marginTop: space.xs,
    width: '100%',
  },
  hint: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
  },
  countdown: {
    ...typography.caption,
    textAlign: 'center',
  },
  primaryBtn: {
    borderRadius: radius.md,
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  primaryBtnText: {
    ...typography.label,
  },
  secondaryBtn: {
    paddingVertical: space.xs,
    alignItems: 'center',
  },
  secondaryBtnText: {
    ...typography.caption,
  },
});
