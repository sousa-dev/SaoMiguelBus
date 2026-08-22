/**
 * The Notifications section in `app/settings.tsx`.
 *
 * Two jobs beyond "edit your defaults", and both are requirements rather than
 * polish.
 *
 * **1. It is the permanent, discoverable route back** for a rider who turned
 * notifications off and later changed their mind (02 §4.4). Someone who blocked
 * notifications months ago should not have to find a journey card and tap a bell
 * to discover why nothing ever arrives. Settings is where people look for this,
 * so the answer and the fix both live here — and the status line reports the
 * live OS gate, read fresh on every focus, never a cached copy (03 §5).
 *
 * **2. The Service updates switch is required by App Store guideline 4.5.4**
 * (11 §I1.2). Journey alarms have an obvious opt-out — disarm the bell — but
 * announcements are auto-scheduled, and on iOS the only alternative was the
 * system-wide toggle, which kills bus alerts too. Android riders had per-channel
 * control; iOS riders had all-or-nothing. It is therefore **ungated**:
 * premium-gating the opt-out for a free feature would be nonsense.
 *
 * Free riders see the alarm types listed with a `Crown` badge before the paywall
 * appears (06 §5). The RevenueCat paywall is a generic offering screen, so a
 * rider who learns what they are buying only after it opens learns it too late.
 */

import { Bell, ChevronRight, Crown, Send } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { ListRow } from '@/components/ui/ListRow';
import { NotificationPrefsSheet } from '@/features/transit/components/NotificationPrefsSheet';
import { NotificationsBlockedSheet } from '@/features/transit/components/NotificationsBlockedSheet';
import { usePremiumGate } from '@/features/premium/hooks/usePremiumGate';
import { useNotificationPrefsStore } from '@/lib/notification-prefs-store';
import {
  trackDefaultsChanged,
  trackSettingsOpened,
  trackSheetOpen,
  trackTestSent,
} from '@/lib/notifications/analytics';
import { useNotificationPreviewSource } from '@/features/transit/hooks/useNotificationPreviewSource';
import { sendTestNotification } from '@/lib/notifications/scheduler';
import { ensurePermission, permissionGate, type PermissionGate } from '@/lib/notifications/scheduler';
import { usePremium } from '@/lib/premium-store';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const STATUS_KEY: Record<PermissionGate, string> = {
  granted: 'notificationsStatusGranted',
  askable: 'notificationsStatusAskable',
  blocked: 'notificationsStatusBlocked',
};

/** The four types, listed so a free rider knows what the paywall is selling. */
const ALARM_TYPE_KEYS = [
  'notificationsTypeLeaveNow',
  'notificationsTypeChange',
  'notificationsTypeAlight',
  'notificationsTypeComplete',
] as const;

export function NotificationSettingsSection() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isPremium = usePremium();
  const { guardPremiumAction } = usePremiumGate();
  const defaults = useNotificationPrefsStore((s) => s.defaults);
  const setDefaults = useNotificationPrefsStore((s) => s.setDefaults);

  const [gate, setGate] = useState<PermissionGate | null>(null);
  const [testSent, setTestSent] = useState(false);
  const previewSource = useNotificationPreviewSource({});
  const [sheetVisible, setSheetVisible] = useState(false);
  const [blockedVisible, setBlockedVisible] = useState(false);

  // Re-read on every focus, so returning from system settings shows the truth
  // rather than whatever was true when this screen first mounted.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void permissionGate().then((next) => {
        if (!cancelled) {
          setGate(next);
        }
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const openDefaults = useCallback(async () => {
    const current = await permissionGate('settings_row');
    setGate(current);
    if (current === 'blocked') {
      // Never request while blocked — the OS shows nothing and resolves denied,
      // which is an invisible dead tap (05 §2.0).
      setBlockedVisible(true);
      return;
    }
    if (current === 'askable') {
      setGate(await ensurePermission('settings_row'));
    }
    trackSheetOpen('default', isPremium);
    setSheetVisible(true);
  }, [isPremium]);

  /**
   * Deliberately ungated, and deliberately the ANNOUNCEMENT channel.
   *
   * "Do notifications actually work on this phone" is a question every rider
   * has, not a premium one — and the free service-updates channel is exactly
   * what a non-subscriber would receive, so testing it is both honest and the
   * only thing they can meaningfully verify. Per-alarm-type tests live in the
   * defaults sheet, which is premium territory anyway.
   */
  const sendTest = () => {
    void (async () => {
      const result = await sendTestNotification('announcement', previewSource, 'settings_row');
      setGate(result);
      if (result === 'blocked') {
        setBlockedVisible(true);
        return;
      }
      if (result !== 'granted') {
        return;
      }
      trackTestSent('announcement', 'settings_row');
      setTestSent(true);
    })();
  };

  const onRowPress = () => {
    if (isPremium) {
      void openDefaults();
      return;
    }
    void guardPremiumAction(() => void openDefaults(), 'notify_settings');
  };

  return (
    <>
      <Text style={[typography.overline, styles.sectionLabel, { color: theme.muted }]}>
        {t('notificationsSettingsRow')}
      </Text>
      <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ListRow
          icon={Bell}
          title={t('notificationsSettingsRow')}
          // A free rider is being pitched, not informed: the OS permission
          // state is not yet their question. `busNotificationsText` has been
          // translated in all eight locales and rendered by nothing since
          // before this feature existed (07 §7).
          subtitle={
            isPremium
              ? (gate ? t(STATUS_KEY[gate]) : t('notificationsSettingsSubtitle'))
              : t('busNotificationsText')
          }
          onPress={onRowPress}
          trailing={isPremium ? undefined : <Badge label={t('premiumHeaderButton')} tone="accent" size="compact" />}
        />

        {/* Ungated, and deliberately not behind the row above: a free rider must
            be able to switch announcements off without meeting a paywall. */}
        <ListRow
          icon={Bell}
          title={t('notificationsServiceUpdates')}
          subtitle={t('notificationsServiceUpdatesHint')}
          showChevron={false}
          trailing={
            <Switch
              value={defaults.serviceAnnouncements}
              onValueChange={(value) =>
                setDefaults({ ...defaults, serviceAnnouncements: value })
              }
              accessibilityLabel={t('notificationsServiceUpdates')}
            />
          }
        />

        {/* Below the service-updates switch and above the upsell: it belongs
            with the free feature it demonstrates, not with the paid one. */}
        <ListRow
          icon={Send}
          title={t('notificationsTestRow')}
          subtitle={testSent ? t('notificationsTestSent') : t('notificationsTestRowHint')}
          showChevron={false}
          divider={!isPremium}
          onPress={sendTest}
        />

        {isPremium ? null : (
          // Tappable, and to the SAME handler as the row above. This block is
          // the part that actually says what the subscription buys, so it is
          // the most likely thing a rider reaches for — and a list of features
          // that looks like a button but does nothing reads as broken.
          // `guardPremiumAction` decides what happens: paywall while free,
          // straight into the defaults sheet once entitled — including
          // immediately after a purchase or restore, with no second tap.
          <Pressable
            onPress={onRowPress}
            accessibilityRole="button"
            accessibilityLabel={t('premiumFeatureNotifications')}
            accessibilityHint={t('notificationsSettingsSubtitle')}
            style={({ pressed }) => [styles.upsell, pressed && styles.upsellPressed]}
          >
            <View style={styles.upsellHead}>
              <Crown size={16} color={theme.accent} strokeWidth={2} />
              <Text style={[typography.label, styles.upsellTitle, { color: theme.text }]}>
                {t('premiumFeatureNotifications')}
              </Text>
              <ChevronRight size={16} color={theme.muted} strokeWidth={2} />
            </View>
            {ALARM_TYPE_KEYS.map((key) => (
              <Text key={key} style={[typography.label, { color: theme.onSurfaceMuted }]}>
                • {t(key)}
              </Text>
            ))}
          </Pressable>
        )}
      </View>

      <NotificationPrefsSheet
        visible={sheetVisible}
        mode="default"
        initial={defaults}
        onTestBlocked={() => setBlockedVisible(true)}
        onClose={() => setSheetVisible(false)}
        onConfirm={(prefs) => {
          setDefaults(prefs);
          trackDefaultsChanged(prefs);
          setSheetVisible(false);
        }}
      />
      <NotificationsBlockedSheet
        visible={blockedVisible}
        onClose={() => setBlockedVisible(false)}
        onOpenSettings={() => trackSettingsOpened('settings_row')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginTop: space['2xl'], marginBottom: space.sm },
  group: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  upsell: { padding: space.lg, gap: space.xs },
  upsellPressed: { opacity: 0.6 },
  upsellHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs },
  upsellTitle: { flex: 1 },
});
