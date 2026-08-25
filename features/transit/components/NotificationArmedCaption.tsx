/**
 * "We'll tell you at 08h22, 08h47 and one stop before you arrive."
 *
 * Shown under the action row once a journey is armed. Concrete times on purpose
 * (02 §5): a rider needs to see the alarms are set to something plausible, and a
 * wrong time visible now is a bug reported now rather than a missed bus reported
 * next week.
 *
 * Derived from the track rather than from the arm that produced it, so there is
 * one source of truth and the caption self-heals — after a relaunch, or once an
 * alarm has fired, it re-reads the same plan the scheduler would. That also
 * keeps "some alerts were skipped" honest for a journey armed after it had
 * already departed, which stays true for as long as that track exists.
 */

import { Bell } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { exactAlarmGate } from '@/lib/notifications/exact-alarms';
import { planJourneyAlarmsDetailed } from '@/lib/notifications/plan';
import { summariseArmedAlarms } from '@/lib/notifications/summary';
import { degradeForInexactAlarms } from '@/lib/notifications/types';
import type { ActiveTrack } from '@/lib/profile-store';
import { iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export function NotificationArmedCaption({ track }: { track: ActiveTrack | undefined }) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const summary = useMemo(() => {
    if (!track?.notify) {
      return null;
    }
    // Mirror exactly what `armTrack` did, so the caption cannot promise a
    // precision the platform was never asked for.
    const precise = exactAlarmGate() !== 'askable';
    const effective = precise ? track.notify : degradeForInexactAlarms(track.notify);
    const { alarms, skippedPast } = planJourneyAlarmsDetailed(track, effective, new Date());
    return summariseArmedAlarms(alarms, { precise, skippedPast });
  }, [track]);

  if (!summary) {
    return null;
  }

  const line = [
    summary.timesKey ? t(summary.timesKey, { times: summary.times }) : null,
    summary.includesAlight ? t('notificationsArmedAlight') : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Bell size={iconSize.sm} color={theme.primary} strokeWidth={2} />
        <Text style={[typography.label, styles.text, { color: theme.onSurfaceMuted }]}>{line}</Text>
      </View>
      {summary.someSkipped ? (
        <Text style={[typography.label, { color: theme.muted }]}>
          {t('notificationsSomeSkipped')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs, marginTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  text: { flex: 1 },
});
