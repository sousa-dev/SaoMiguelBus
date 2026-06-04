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
      {active.map(({ track, status }) => (
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
            {status.statusLabel} · {status.countdown}
          </Text>
          {status.progress > 0 && status.phase !== 'completed' ? (
            <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
              <View
                style={[styles.barFill, { width: `${status.progress}%`, backgroundColor: theme.primary }]}
              />
            </View>
          ) : null}
        </View>
      ))}
    </TransitCollapsibleSection>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: space.md,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barTrack: { height: 4, borderRadius: 2, marginTop: space.sm, overflow: 'hidden' },
  barFill: { height: '100%' },
});
