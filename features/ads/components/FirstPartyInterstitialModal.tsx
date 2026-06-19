import { Crown } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ModalSafeArea } from '@/components/ui/ModalSafeArea';
import { resolveAdHref } from '@/features/ads/lib/ad-link';
import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { track } from '@/lib/analytics';
import { recordAdClick } from '@/lib/api';
import { logger } from '@/lib/logger';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { AdPayload } from '@/lib/types';

type Props = {
  visible: boolean;
  ad: AdPayload;
  onDismiss: () => void;
};

export function FirstPartyInterstitialModal({ visible, ad, onDismiss }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { openPaywall } = usePaywall();

  const onAdPress = async () => {
    track('transit', 'ad_click', { on: 'interstitial', adId: ad.id });
    void recordAdClick(ad.id);
    const href = resolveAdHref(ad);
    if (!href) {
      return;
    }
    try {
      await Linking.openURL(href);
    } catch (error) {
      logger.warn('interstitial ad open failed', error);
    }
  };

  const onUpgrade = () => {
    track('transit', 'interstitial_upsell_click', { source: 'first_party_modal' });
    onDismiss();
    void openPaywall();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onDismiss}
    >
      <View style={[styles.fullscreen, { backgroundColor: theme.background }]}>
        <ModalSafeArea style={styles.safe}>
          <View style={styles.header}>
            <View style={[styles.adBadge, { backgroundColor: theme.primary }]}>
              <Text style={[styles.adBadgeText, { color: theme.onPrimary }]}>{t('transitAdLabel')}</Text>
            </View>
            <Pressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={t('close')}
              style={styles.closeBtn}
            >
              <Text style={[styles.closeText, { color: theme.muted }]}>×</Text>
            </Pressable>
          </View>

          <Pressable onPress={onAdPress} accessibilityRole="link" style={styles.imageWrap}>
            <Image
              source={{ uri: ad.media }}
              style={styles.banner}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </Pressable>

          <View style={styles.footer}>
            <View style={styles.crownRow}>
              <Crown size={22} color="#F59E0B" strokeWidth={2.5} />
              <Text style={[styles.title, { color: theme.text }]}>{t('upgradeForBetterTitle')}</Text>
            </View>
            <Text style={[styles.body, { color: theme.muted }]}>{t('interstitialAdDescription')}</Text>
            <Pressable
              onPress={onUpgrade}
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              accessibilityRole="button"
            >
              <Text style={[styles.primaryBtnText, { color: theme.onPrimary }]}>
                {t('upgradeNowButton')}
              </Text>
            </Pressable>
            <Pressable onPress={onDismiss} accessibilityRole="button" style={styles.secondaryBtn}>
              <Text style={[styles.secondaryBtnText, { color: theme.muted }]}>
                {t('continueWithAdsButton')}
              </Text>
            </Pressable>
          </View>
        </ModalSafeArea>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: space.lg,
  },
  header: {
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
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 32,
    lineHeight: 32,
    fontWeight: '300',
  },
  imageWrap: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: space.md,
  },
  banner: {
    width: '100%',
    height: '100%',
    maxHeight: 420,
    borderRadius: radius.md,
  },
  footer: {
    gap: space.sm,
    alignItems: 'center',
    paddingBottom: space.md,
  },
  crownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    width: '100%',
  },
  title: {
    ...typography.label,
    fontSize: 16,
    textAlign: 'center',
    flexShrink: 1,
  },
  body: {
    ...typography.body,
    fontSize: 14,
    textAlign: 'center',
  },
  primaryBtn: {
    width: '100%',
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: 'center',
    marginTop: space.xs,
  },
  primaryBtnText: {
    ...typography.label,
    fontSize: 16,
  },
  secondaryBtn: {
    paddingVertical: space.sm,
  },
  secondaryBtnText: {
    ...typography.caption,
  },
});
