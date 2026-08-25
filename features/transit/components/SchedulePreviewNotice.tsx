import { AlertTriangle, CalendarCheck } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useScheduleConfig } from '@/features/transit/hooks/useScheduleConfig';
import { formatAppDate } from '@/lib/date-format';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

/**
 * The preview caveat, attached to the RESULTS rather than the screen (03 §3).
 *
 * A user who scrolls past the banner, or shares a screenshot, must still see
 * that these times are not yet valid. The date is formatted from the server's
 * `cutoverAt` — never a literal.
 */
export function SchedulePreviewStrip() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const { showPreviewWarning, config } = useScheduleConfig(i18n.language);

  if (!showPreviewWarning) {
    return null;
  }

  // The caveat must never depend on a cutover being armed. A preview can be
  // offered before the date is set, and "these times are not in force yet" is
  // exactly what the user needs to know either way.
  const message = config?.cutoverAt
    ? t('transitSchedulePreviewWarning', { date: formatAppDate(new Date(config.cutoverAt)) })
    : t('transitSchedulePreviewWarningUndated');

  return (
    <View style={[styles.strip, { borderColor: theme.warning, backgroundColor: theme.card }]}>
      <AlertTriangle size={16} color={theme.warning} />
      <Text style={[typography.caption, { color: theme.text, flex: 1 }]}>{message}</Text>
    </View>
  );
}

/** The same caveat, compressed to a chip for each result card (03 §3). */
export function SchedulePreviewChip() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const { showPreviewWarning } = useScheduleConfig(i18n.language);

  if (!showPreviewWarning) {
    return null;
  }

  return (
    <View style={[styles.chip, { borderColor: theme.warning }]}>
      <AlertTriangle size={12} color={theme.warning} />
      <Text style={[typography.caption, { color: theme.warning }]}>
        {t('transitSchedulePreviewChip')}
      </Text>
    </View>
  );
}

/**
 * The "valid since" badge (03 §4). Shown only during the live phase; it retires
 * when the server moves the phase on, not on a client-side date comparison.
 */
export function ScheduleValidBadge() {
  const theme = useAppTheme();
  const { i18n } = useTranslation();
  const { showBadge, badgeText } = useScheduleConfig(i18n.language);

  if (!showBadge || !badgeText) {
    return null;
  }

  return (
    <View style={[styles.chip, { borderColor: theme.primary }]}>
      <CalendarCheck size={12} color={theme.primary} />
      <Text style={[typography.caption, { color: theme.primary }]}>{badgeText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginBottom: space.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
});
