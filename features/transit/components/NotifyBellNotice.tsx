/**
 * Everything the bell has to SAY, under the action row.
 *
 * Four mutually exclusive lines, in priority order — the newest answer to the
 * rider's most recent action wins, because stacking them would produce "alerts
 * are off" directly above "we'll tell you at 08h22":
 *
 *  1. **This journey has already departed** — the arm was refused (02 §5).
 *  2. **Alerts are off. You can turn them on any time.** — they declined the OS
 *     prompt a moment ago. Quiet, inline, no sheet and no push to Settings:
 *     they have just answered the question (05 §3.1).
 *  3. **Notifications on — we'll alert you about this journey** — the arm
 *     completed by itself on return from Settings (05 §3.3).
 *  4. The armed caption, with the concrete instants.
 */

import { AlertCircle, Check } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { NotificationArmedCaption } from '@/features/transit/components/NotificationArmedCaption';
import type { NotifyBellState } from '@/features/transit/hooks/useNotifyBell';
import { useNotificationUiStore } from '@/lib/notifications/ui-store';
import type { ActiveTrack } from '@/lib/profile-store';
import { iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  state: NotifyBellState;
  track: ActiveTrack | undefined;
};

export function NotifyBellNotice({ state, track }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const deniedTrackId = useNotificationUiStore((s) => s.deniedTrackId);
  const resumedTrackId = useNotificationUiStore((s) => s.resumedTrackId);

  if (state.allPast) {
    return (
      <Pressable onPress={state.dismissAllPast} style={styles.row}>
        <AlertCircle size={iconSize.sm} color={theme.warning} strokeWidth={2} />
        <Text style={[typography.label, styles.text, { color: theme.onSurfaceMuted }]}>
          {t('notificationsAllPast')}
        </Text>
      </Pressable>
    );
  }

  if (track && deniedTrackId === track.id) {
    return (
      <View style={styles.row}>
        <Text style={[typography.label, styles.text, { color: theme.muted }]}>
          {t('notificationsDeniedInline')}
        </Text>
      </View>
    );
  }

  if (track && resumedTrackId === track.id) {
    return (
      <View style={styles.row}>
        <Check size={iconSize.sm} color={theme.success} strokeWidth={2} />
        <Text style={[typography.label, styles.text, { color: theme.onSurfaceMuted }]}>
          {t('notificationsResumed')}
        </Text>
      </View>
    );
  }

  return <NotificationArmedCaption track={track} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
  },
  text: { flex: 1 },
});
