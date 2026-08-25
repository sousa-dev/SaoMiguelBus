import { Pin, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { TransitCollapsibleSection } from '@/features/transit/components/TransitCollapsibleSection';
import { usePremiumGate } from '@/features/premium/hooks/usePremiumGate';
import { useBusTracking } from '@/features/transit/hooks/useBusTracking';
import { useFollowPinnedRoute } from '@/features/transit/hooks/useFollowPinnedRoute';
import { useScheduleConfig } from '@/features/transit/hooks/useScheduleConfig';
import { usePremium } from '@/lib/premium-store';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { PinnedRoute } from '@/lib/profile-store';

type Props = {
  onSelect: (origin: string, destination: string) => void;
};

export function PinnedRoutesSection({ onSelect }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isPremium = usePremium();
  const { canTrackTrips } = useScheduleConfig();
  const { guardPremiumAction } = usePremiumGate();
  const { pinned, unpinRoute } = useBusTracking();
  const { followPin, followingId } = useFollowPinnedRoute();

  // Webapp parity: pinned routes are a premium-only widget.
  if (!isPremium || pinned.length === 0) {
    return null;
  }

  return (
    <TransitCollapsibleSection
      icon={<Pin size={16} color={theme.onInfo} />}
      iconBackground={theme.info}
      title={t('transitPinnedRoutes')}
      subtitle={t('pinnedRoutesSubtitle')}
      countLabel={String(pinned.length)}
      countBackground={theme.infoSurface}
      countColor={theme.info}
      defaultOpen={false}
    >
      {pinned.map((pin) => (
        <View
          key={pin.id}
          style={[
            styles.card,
            { borderColor: theme.border, backgroundColor: theme.surfaceVariant },
            // Never removed, only greyed — a pin vanishing on cutover day reads
            // as data loss (09 §3.5).
            pin.unavailable ? styles.unavailable : null,
          ]}
        >
          <View style={styles.header}>
            <Pressable style={{ flex: 1 }} onPress={() => onSelect(pin.origin, pin.destination)}>
              <Text style={[typography.headline, { color: theme.text }]}>{pin.routeNumber}</Text>
              <Text style={[typography.body, { color: theme.muted }]}>
                {pin.origin} → {pin.destination}
              </Text>
              <Text style={[typography.caption, { color: theme.muted, marginTop: space.xs }]}>
                {pinShape(pin, t)}
              </Text>
            </Pressable>
            <IconButton
              icon={X}
              variant="ghost"
              size="sm"
              color={theme.muted}
              accessibilityLabel={t('transitUnpinRoute')}
              onPress={() => unpinRoute(pin.id)}
            />
          </View>

          {pin.unavailable ? (
            <Text style={[typography.caption, { color: theme.warning, marginTop: space.sm }]}>
              {t('transitPinnedUnavailable')}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.action, { borderColor: theme.border }]}
              onPress={() => onSelect(pin.origin, pin.destination)}
            >
              <Text style={[typography.caption, { color: theme.text }]}>
                {t('transitPinnedViewTimes')}
              </Text>
            </Pressable>
            {/* A pin can be STORED while previewing, but a countdown still must
                not run against a timetable that is not in force (09 §2 Gap A —
                the gate splits, it does not disappear). */}
            {canTrackTrips && !pin.unavailable ? (
              <Pressable
                style={[
                  styles.action,
                  { borderColor: theme.primary },
                  followingId ? styles.busy : null,
                ]}
                disabled={followingId !== null}
                onPress={() =>
                  // Trip ids roll overnight and the migration drops them
                  // outright, so following a pin means re-running its search
                  // and tracking the itinerary that comes back.
                  void guardPremiumAction(() => void followPin(pin), 'track_start')
                }
              >
                <Text style={[typography.caption, { color: theme.primary }]}>
                  {followingId === pin.id
                    ? t('transitPinnedFollowSearching')
                    : t('transitPinnedFollow')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}
    </TransitCollapsibleSection>
  );
}

/** `09h15 · 1 change at Lagoa · arrives 10h21` — a pin has to show its shape. */
function pinShape(pin: PinnedRoute, t: (key: string, params?: Record<string, unknown>) => string) {
  const legs = pin.legs ?? [];
  const parts: string[] = [];
  const departure = legs[0]?.start;
  const arrival = legs[legs.length - 1]?.end;

  if (departure) {
    parts.push(departure);
  }
  if (pin.transfers?.length) {
    parts.push(
      t('transitPinnedChanges', {
        count: pin.transfers.length,
        at: pin.transfers.map((x) => x.at).join(', '),
      }),
    );
  } else if (legs.length === 1) {
    parts.push(t('transitPinnedDirect'));
  }
  if (arrival) {
    parts.push(t('transitPinnedArrives', { time: arrival }));
  }
  return parts.join(' · ');
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: space.md,
  },
  unavailable: { opacity: 0.55 },
  busy: { opacity: 0.6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  action: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
  },
});
