/**
 * The sheet a rider sees when they ask for notifications and the OS will never
 * prompt again.
 *
 * Shown **only** when the gate is `blocked` — never volunteered, never as a
 * nag. Reached easily and permanently: one denial on iOS, two on Android 13+.
 *
 * Three things this copy is doing deliberately (05 §3.2):
 *
 *  1. **It explains why there is no dialog.** Without that the rider reasonably
 *     expects a prompt and reads its absence as a broken button — the same
 *     dead-tap failure commit `b764b2a` fixed for the paywall.
 *  2. **It does not blame or nag.** One sheet, on demand.
 *  3. **It promises the resume**, so the trip to Settings is not a dead end.
 *
 * `Linking.openSettings()` rather than a hand-built `app-settings:` URL, which
 * is iOS-only and fragile. It lands on the app's own page on both platforms.
 */

import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called just before Settings opens, so the caller can record its intent. */
  onOpenSettings?: () => void;
};

export function NotificationsBlockedSheet({ visible, onClose, onOpenSettings }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose} title={t('notificationsBlockedTitle')}>
      <View style={styles.body}>
        <Text style={[typography.body, { color: theme.onSurfaceMuted }]}>
          {t('notificationsBlockedBody')}
        </Text>
        <Button
          label={t('notificationsOpenSettings')}
          fullWidth
          onPress={() => {
            onOpenSettings?.();
            onClose();
            void Linking.openSettings();
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
