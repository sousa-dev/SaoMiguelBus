/**
 * The in-app row that offers notification permission for the free announcement
 * channel — the awkward case, handled deliberately.
 *
 * A free rider has no reason to have granted notification permission, and the
 * announcement channel refuses to cold-prompt them for it (01 §4.1). So instead
 * of a system dialog appearing out of nowhere, they get a row that says exactly
 * what the notification would be about, on the screen where the timetable change
 * is already the subject.
 *
 * Shown **only** when an announcement is actually pending and permission is
 * absent, and remembered per announcement id so it is asked at most once. A row
 * that reappears every launch is a nag, and this one is asking for something the
 * rider can only say no to permanently.
 *
 * Ungated, and free of any upsell: this is a public-service message about
 * timetables the app previously told them wrong, not a premium feature
 * (01 §1, 11 §I1.1).
 */

import { BellRing } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  dismissServiceAnnouncement,
  enableServiceAnnouncements,
} from '@/features/transit/hooks/useServiceAnnouncements';
import { useNotificationUiStore } from '@/lib/notifications/ui-store';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export function ServiceAnnouncementPrompt() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  // Published by the sweep in the app shell, rendered here — beside the banner
  // that explains the same change.
  const prompt = useNotificationUiStore((s) => s.announcementPrompt);

  if (!prompt) {
    return null;
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.infoSurface }]}>
      <View style={styles.head}>
        <BellRing size={iconSize.md} color={theme.info} strokeWidth={2} />
        <View style={styles.copy}>
          <Text style={[typography.bodyStrong, { color: theme.text }]}>
            {t('notificationsAnnouncePromptTitle')}
          </Text>
          <Text style={[typography.label, { color: theme.onSurfaceMuted }]}>
            {t('notificationsAnnouncePromptBody')}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => void enableServiceAnnouncements()}
          style={[styles.action, { backgroundColor: theme.primary }]}
        >
          <Text style={[typography.label, { color: theme.onPrimary }]}>
            {t('notificationsAnnouncePromptAction')}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={dismissServiceAnnouncement} style={styles.action}>
          <Text style={[typography.label, { color: theme.muted }]}>
            {t('notificationsAnnouncePromptDismiss')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, padding: space.md, gap: space.md },
  head: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  copy: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
  action: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
  },
});
