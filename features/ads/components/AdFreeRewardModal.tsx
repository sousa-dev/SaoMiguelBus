import { Clock, PlayCircle, Sparkles } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { RewardModalMode } from '@/features/ads/lib/rewarded-ad-store';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
  mode: RewardModalMode;
  remainingMinutes: number;
  canWatchVideo: boolean;
  isLoading: boolean;
  showGetPremium: boolean;
  onDismiss: () => void;
  onWatchVideo: () => void;
  onGetPremium: () => void;
};

export function AdFreeRewardModal({
  visible,
  mode,
  remainingMinutes,
  canWatchVideo,
  isLoading,
  showGetPremium,
  onDismiss,
  onWatchVideo,
  onGetPremium,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isStatusMode = mode === 'status';
  const Icon = isStatusMode ? Clock : Sparkles;
  const title = isStatusMode
    ? t('adsAdFreeStatusModalTitle')
    : t('adsAdFreeModalTitle');
  const body = isStatusMode
    ? t('adsAdFreeStatusModalBody', { minutes: remainingMinutes })
    : t('adsAdFreeModalBody');

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

          <View style={styles.iconRow}>
            <Icon size={22} color={theme.primary} strokeWidth={2.5} />
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          </View>
          <Text style={[styles.body, { color: theme.muted }]}>{body}</Text>

          {!isStatusMode && canWatchVideo ? (
            <Pressable
              onPress={onWatchVideo}
              disabled={isLoading}
              style={[
                styles.primaryBtn,
                { backgroundColor: theme.primary, opacity: isLoading ? 0.7 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.onPrimary} />
              ) : (
                <View style={styles.primaryBtnInner}>
                  <PlayCircle size={18} color={theme.onPrimary} strokeWidth={2.25} />
                  <Text style={[styles.primaryBtnText, { color: theme.onPrimary }]}>
                    {t('adsAdFreeModalWatchButton')}
                  </Text>
                </View>
              )}
            </Pressable>
          ) : null}

          {!isStatusMode && !canWatchVideo ? (
            <Text style={[styles.unavailable, { color: theme.muted }]}>
              {t('adsAdFreeRewardUnavailable')}
            </Text>
          ) : null}

          {showGetPremium ? (
            <Pressable
              onPress={onGetPremium}
              style={[
                isStatusMode ? styles.primaryBtn : styles.premiumBtn,
                isStatusMode
                  ? { backgroundColor: theme.primary }
                  : { borderColor: theme.border },
              ]}
              accessibilityRole="button"
            >
              <Text
                style={[
                  isStatusMode ? styles.primaryBtnText : styles.premiumBtnText,
                  { color: isStatusMode ? theme.onPrimary : theme.text },
                ]}
              >
                {t('adsAdFreeModalRemoveAdsPermanently')}
              </Text>
            </Pressable>
          ) : null}

          <Pressable onPress={onDismiss} accessibilityRole="button" style={styles.secondaryBtn}>
            <Text style={[styles.secondaryBtnText, { color: theme.muted }]}>
              {t('adsAdFreeModalDismissButton')}
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
  iconRow: {
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
  unavailable: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: space.xs,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: radius.md,
    paddingVertical: space.sm,
    alignItems: 'center',
    marginTop: space.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  primaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  primaryBtnText: {
    ...typography.label,
  },
  premiumBtn: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.sm,
    alignItems: 'center',
    marginTop: space.xs,
  },
  premiumBtnText: {
    ...typography.label,
  },
  secondaryBtn: {
    paddingVertical: space.xs,
  },
  secondaryBtnText: {
    ...typography.caption,
  },
});
