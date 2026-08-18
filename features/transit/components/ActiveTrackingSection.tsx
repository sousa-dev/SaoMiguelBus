import { LocateFixed, X } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { TransitCollapsibleSection } from '@/features/transit/components/TransitCollapsibleSection';
import { useBusTracking } from '@/features/transit/hooks/useBusTracking';
import { usePremium } from '@/lib/premium-store';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { JourneyTrackStatus } from '@/lib/bus-tracking';

export function ActiveTrackingSection() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isPremium = usePremium();
  const { active, stopTracking } = useBusTracking();

  // Webapp parity: the active-tracking widget is premium-only.
  if (!isPremium || active.length === 0) {
    return null;
  }

  return (
    <TransitCollapsibleSection
      icon={<LocateFixed size={16} color={theme.onPrimary} />}
      iconBackground={theme.primary}
      title={t('transitActiveTracking')}
      subtitle={t('activeTrackingSubtitle')}
      countLabel={
        active.length === 1
          ? t('trackingCountSingular')
          : t('trackingCountPlural', { count: active.length })
      }
      countBackground={theme.successSurface}
      countColor={theme.success}
    >
      {active.map(({ track, journey }) => (
        <View
          key={track.id}
          style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
        >
          <View style={styles.header}>
            <Text style={[typography.headline, { color: theme.primary }]}>{track.routeNumber}</Text>
            <IconButton
              icon={X}
              variant="ghost"
              size="sm"
              color={theme.muted}
              accessibilityLabel={t('transitStopTrack')}
              onPress={() => stopTracking(track.id)}
            />
          </View>
          <Text style={[typography.body, { color: theme.text }]}>
            {track.origin} → {track.destination}
          </Text>
          <Text style={[typography.caption, { color: theme.muted, marginTop: space.xs }]}>
            {t(journey.statusLabel.key, journey.statusLabel.params)} ·{' '}
            {t(journey.countdown.key, journey.countdown.params)}
          </Text>
          <LegStrip journey={journey} />
        </View>
      ))}
    </TransitCollapsibleSection>
  );
}

/**
 * One row per bus with the change spelled out between them (09 §3.4).
 *
 * A single bar across the whole itinerary would draw the wait at an interchange
 * as if the rider were still moving, which is exactly the state they most need to
 * see. A direct journey has one leg and reads as the old single bar.
 */
function LegStrip({ journey }: { journey: JourneyTrackStatus }) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  if (journey.legs.length === 0) {
    return null;
  }

  return (
    <View style={styles.strip}>
      {journey.legs.map((leg, index) => {
        // `transfers[i]` is the change made BEFORE leg i + 1, so leg i reads the
        // one at i - 1. A direct journey has none and this stays null throughout.
        const transfer = index > 0 ? (journey.transfers[index - 1] ?? null) : null;
        const isCurrent = leg.state === 'riding';
        const fill =
          leg.state === 'done' ? theme.success : isCurrent ? theme.primary : theme.border;
        return (
          <View key={`${leg.routeNumber}-${index}`}>
            {transfer ? (
              <Text
                style={[
                  typography.caption,
                  { color: transfer.tight ? theme.warning : theme.muted, marginBottom: space.xs },
                ]}
              >
                {t(
                  transfer.tight ? 'trackStatusTransferTightWait' : 'trackStatusTransferWait',
                  { minutes: transfer.waitMinutes, at: transfer.at },
                )}
              </Text>
            ) : null}
            <View style={styles.legRow}>
              <Text
                style={[
                  typography.caption,
                  styles.legRoute,
                  { color: isCurrent ? theme.primary : theme.muted },
                ]}
                numberOfLines={1}
              >
                {leg.routeNumber}
              </Text>
              <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                <View style={[styles.barFill, { width: `${leg.progress}%`, backgroundColor: fill }]} />
              </View>
              <Text
                style={[typography.caption, styles.legArrival, { color: theme.muted }]}
                numberOfLines={1}
              >
                {leg.destination} {leg.arrival}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: space.md,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  strip: { marginTop: space.sm, gap: space.xs },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  legRoute: { minWidth: 36 },
  legArrival: { flexShrink: 1, maxWidth: '45%', textAlign: 'right' },
  barTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%' },
});
