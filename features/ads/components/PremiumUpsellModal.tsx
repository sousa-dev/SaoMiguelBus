import { Crown } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { track } from '@/lib/analytics';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

/** Shown after an AdMob video interstitial closes — webapp upsell parity. */
export function PremiumUpsellModal({ visible, onDismiss }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { openPaywall } = usePaywall();

  const onUpgrade = () => {
    track('transit', 'interstitial_upsell_click', { source: 'post_video_modal' });
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

          <View style={styles.crownRow}>
            <Crown size={22} color="#F59E0B" strokeWidth={2.5} />
            <Text style={[styles.title, { color: theme.text }]}>{t('removeAdsTitle')}</Text>
          </View>
          <Text style={[styles.body, { color: theme.muted }]}>{t('interstitialAdDescription')}</Text>
          <Text style={[styles.sub, { color: theme.muted }]}>{t('removeAdsBannerSubtitle')}</Text>

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
    padding: space.lg,
    gap: space.sm,
    alignItems: 'center',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: space.xs,
  },
  closeText: {
    fontSize: 28,
    lineHeight: 28,
  },
  crownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  title: {
    ...typography.title,
    fontSize: 18,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    fontSize: 14,
    textAlign: 'center',
  },
  sub: {
    ...typography.caption,
    textAlign: 'center',
  },
  primaryBtn: {
    width: '100%',
    borderRadius: radius.md,
    paddingVertical: space.sm,
    alignItems: 'center',
    marginTop: space.sm,
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
