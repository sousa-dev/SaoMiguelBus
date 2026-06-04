import { Bus, ChevronDown, ChevronUp, Footprints, MapPin, Shuffle } from 'lucide-react-native';
import React, { Fragment, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { AdBanner } from '@/features/ads/components/AdBanner';
import { RouteMap } from '@/features/transit/components/RouteMap';
import { iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { DirectionsResponse, DirectionsRoute, DirectionsStep } from '@/lib/types';

function formatDistance(meters: number) {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

function cleanInstruction(html?: string) {
  return html?.replace(/<[^>]+>/g, '').trim() ?? '';
}

function shortAddress(address?: string) {
  if (!address) {
    return '';
  }
  return address.split(',')[0];
}

type Props = {
  data: DirectionsResponse;
  origin: string;
  destination: string;
};

function StepRow({ step, theme, t }: { step: DirectionsStep; theme: ReturnType<typeof useAppTheme>; t: (k: string, o?: Record<string, unknown>) => string }) {
  const isTransit = step.travel_mode === 'TRANSIT';
  const StepIcon = isTransit ? Bus : Footprints;
  const transit = step.transit_details;
  const arrivalText = transit?.arrival_time?.text;

  const title =
    transit?.line?.short_name ||
    transit?.line?.name ||
    cleanInstruction(step.html_instructions) ||
    (isTransit ? t('transitBusLabel') : t('transitWalkLabel'));

  return (
    <View style={[styles.step, { borderTopColor: theme.border }]}>
      <View style={styles.stepRow}>
        <StepIcon size={iconSize.md} color={theme.primary} strokeWidth={2} />
        <Text style={[typography.bodyStrong, { color: theme.text, flex: 1 }]}>{title}</Text>
        {arrivalText ? (
          <Text style={[typography.caption, { color: theme.primary, fontWeight: '700' }]}>{arrivalText}</Text>
        ) : null}
      </View>

      <View style={styles.stepMeta}>
        {step.duration?.value ? (
          <Text style={[typography.caption, { color: theme.muted }]}>
            {formatDuration(step.duration.value)}
          </Text>
        ) : null}
        {step.distance?.text ? (
          <Text style={[typography.caption, { color: theme.muted }]}>{step.distance.text}</Text>
        ) : null}
      </View>

      {isTransit && transit ? (
        <View style={[styles.transitBox, { backgroundColor: theme.surfaceVariant }]}>
          {transit.departure_stop?.name ? (
            <View style={styles.transitLine}>
              <MapPin size={iconSize.sm} color={theme.success} />
              <Text style={[typography.caption, { color: theme.muted }]}>{t('departFrom')}</Text>
              <Text style={[typography.label, { color: theme.text, flex: 1 }]}>
                {transit.departure_stop.name}
              </Text>
            </View>
          ) : null}
          {transit.arrival_stop?.name ? (
            <View style={styles.transitLine}>
              <MapPin size={iconSize.sm} color={theme.danger} />
              <Text style={[typography.caption, { color: theme.muted }]}>{t('arriveAt')}</Text>
              <Text style={[typography.label, { color: theme.text, flex: 1 }]}>
                {transit.arrival_stop.name}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function RouteDirectionCard({ route, index }: { route: DirectionsRoute; index: number }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const leg = route.legs?.[0];
  if (!leg) {
    return null;
  }

  const steps = leg.steps ?? [];
  const walkDistance = steps
    .filter((s) => s.travel_mode === 'WALKING')
    .reduce((total, s) => total + (s.distance?.value ?? 0), 0);
  const busDistance = steps
    .filter((s) => s.travel_mode === 'TRANSIT')
    .reduce((total, s) => total + (s.distance?.value ?? 0), 0);
  const transfers = Math.max(0, steps.filter((s) => s.travel_mode === 'TRANSIT').length - 1);

  return (
    <Card>
      <View style={styles.timesRow}>
        {leg.departure_time?.text ? (
          <Text style={[styles.bigTime, { color: theme.text }]}>{leg.departure_time.text}</Text>
        ) : null}
        <View style={styles.middle}>
          <Text style={[typography.caption, { color: theme.muted }]}>
            {formatDuration(leg.duration?.value ?? 0)}
          </Text>
          {transfers > 0 ? (
            <View style={styles.transferChip}>
              <Shuffle size={12} color={theme.muted} />
              <Text style={[typography.caption, { color: theme.muted }]}>
                {transfers} {transfers === 1 ? t('transfer') : t('transfers')}
              </Text>
            </View>
          ) : null}
        </View>
        {leg.arrival_time?.text ? (
          <Text style={[styles.bigTime, { color: theme.text }]}>{leg.arrival_time.text}</Text>
        ) : null}
      </View>

      <View style={styles.addressRow}>
        <Text style={[typography.label, { color: theme.text, flex: 1 }]} numberOfLines={2}>
          {shortAddress(leg.start_address)}
        </Text>
        <Text style={[typography.label, { color: theme.text, flex: 1, textAlign: 'right' }]} numberOfLines={2}>
          {shortAddress(leg.end_address)}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Footprints size={iconSize.sm} color={theme.muted} />
        <Text style={[typography.caption, { color: theme.muted }]}>{formatDistance(walkDistance)}</Text>
        <Bus size={iconSize.sm} color={theme.muted} />
        <Text style={[typography.caption, { color: theme.muted }]}>{formatDistance(busDistance)}</Text>
      </View>

      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.expandBtn}
        accessibilityRole="button"
        accessibilityLabel={t('clickToSeeDetails')}
      >
        <Text style={[typography.caption, { color: theme.info, fontWeight: '600' }]}>
          {t('clickToSeeDetails')}
        </Text>
        {expanded ? <ChevronUp size={20} color={theme.info} /> : <ChevronDown size={20} color={theme.info} />}
      </Pressable>

      {expanded ? (
        <View>
          {steps.map((step, stepIndex) => (
            <StepRow key={`step-${index}-${stepIndex}`} step={step} theme={theme} t={t} />
          ))}
          <RouteMap route={route} />
          {/* Journey-tracking button insertion point — deferred to buses-module parity plan (005). */}
        </View>
      ) : null}
    </Card>
  );
}

export function DirectionsResults({ data, origin, destination }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  if (!data.routes?.length) {
    return (
      <Card style={{ marginTop: space.lg }}>
        <Text style={[typography.headline, { color: theme.text }]}>
          {t('noRoutesMessage', { origin, destination })}
        </Text>
        <Text style={[typography.body, { color: theme.muted, marginTop: space.sm }]}>{t('noRoutesSubtitle')}</Text>
      </Card>
    );
  }

  const routes = data.routes;
  return (
    <View style={styles.list}>
      {routes.map((route, routeIndex) => {
        // Webapp parity: inline ad after every 2 routes (never after the last).
        const showInlineAd = (routeIndex + 1) % 2 === 0 && routeIndex < routes.length - 1;
        return (
          <Fragment key={`route-${routeIndex}`}>
            <RouteDirectionCard route={route} index={routeIndex} />
            {showInlineAd ? <AdBanner on="routes" slot={`inline-${routeIndex}`} /> : null}
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md, marginTop: space.sm, width: '100%' },
  timesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigTime: { fontSize: 22, fontWeight: '700', width: '25%' },
  middle: { flex: 1, alignItems: 'center', gap: 2 },
  transferChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addressRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, marginTop: space.sm },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs, marginTop: space.sm },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.sm,
    marginTop: space.sm,
  },
  step: { paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepMeta: { flexDirection: 'row', gap: space.md, marginLeft: 28, marginTop: 2 },
  transitBox: { marginLeft: 28, marginTop: space.sm, borderRadius: 8, padding: space.sm, gap: space.xs },
  transitLine: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
