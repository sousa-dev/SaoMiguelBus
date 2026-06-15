import { Crown } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={t('close')}
            style={styles.closeBtn}
          >
            <Text style={[styles.closeText, { color: theme.muted }]}>×</Text>
          </Pressable>

          <Pressable onPress={onAdPress} accessibilityRole="link">
            <Image
              source={{ uri: ad.media }}
              style={styles.banner}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </Pressable>

          <View style={styles.ctaBlock}>
            <View style={styles.crownRow}>
              <Crown size={18} color="#F59E0B" strokeWidth={2.5} />
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: space.lg,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: space.md,
    gap: space.md,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: space.xs,
  },
  closeText: {
    fontSize: 28,
    lineHeight: 28,
  },
  banner: {
    width: '100%',
    height: 120,
    borderRadius: radius.md,
  },
  ctaBlock: {
    gap: space.sm,
    alignItems: 'center',
  },
  crownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  title: {
    ...typography.label,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
  primaryBtn: {
    width: '100%',
    borderRadius: radius.md,
    paddingVertical: space.sm,
    alignItems: 'center',
    marginTop: space.xs,
  },
  primaryBtnText: {
    ...typography.label,
  },
  secondaryBtn: {
    paddingVertical: space.xs,
  },
  secondaryBtnText: {
    ...typography.caption,
  },
});
