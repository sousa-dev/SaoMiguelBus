/**
 * "Turn on precise timing" — the Android-only second permission.
 *
 * Shown **only** when the rider reaches for an alarm that needs it, never
 * alongside the notification prompt (05 §4B.4). Two system permission requests
 * back to back, for one tap, reads as an app demanding things — and the second
 * one would land before the rider has any idea why it is being asked for.
 *
 * *Not now* is a real option, not a soft no: `leaveNow` and `change` still work
 * without this, biased early enough to absorb the delay window. What the rider
 * gives up by declining is the two alarms that are actively harmful when late,
 * which is exactly what the body text says.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { openExactAlarmSettings } from '@/lib/notifications/exact-alarms';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function NotificationsExactAlarmSheet({ visible, onClose }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose} title={t('notificationsExactTitle')}>
      <View style={styles.body}>
        <Text style={[typography.body, { color: theme.onSurfaceMuted }]}>
          {t('notificationsExactBody')}
        </Text>
        <Button
          label={t('notificationsOpenSettings')}
          fullWidth
          onPress={() => {
            onClose();
            openExactAlarmSettings();
          }}
        />
        <Button label={t('notificationsNotNow')} variant="ghost" fullWidth onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.lg, gap: space.md },
});
