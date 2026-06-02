import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@/lib/theme';
import type { DirectionsResponse } from '@/lib/types';

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

type Props = {
  data: DirectionsResponse;
  origin: string;
  destination: string;
};

export function DirectionsResults({ data, origin, destination }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  if (!data.routes?.length) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          {t('noRoutesMessage', { origin, destination })}
        </Text>
        <Text style={{ color: theme.muted, marginTop: 8 }}>{t('noRoutesSubtitle')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {data.routes.map((route, routeIndex) => {
        const leg = route.legs?.[0];
        if (!leg) {
          return null;
        }
        const walkDistance = (leg.steps ?? [])
          .filter((step) => step.travel_mode === 'WALKING')
          .reduce((total, step) => total + (step.distance?.value ?? 0), 0);
        const busDistance = (leg.steps ?? [])
          .filter((step) => step.travel_mode === 'TRANSIT')
          .reduce((total, step) => total + (step.distance?.value ?? 0), 0);
        const transfers = (leg.steps ?? []).filter((step) => step.travel_mode === 'TRANSIT').length - 1;

        return (
          <View
            key={`route-${routeIndex}`}
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={[styles.summary, { color: theme.primary }]}>
              {route.summary || t('directionsButton')} #{routeIndex + 1}
            </Text>
            <Text style={{ color: theme.muted, marginBottom: 8 }}>
              {formatDuration(leg.duration?.value ?? 0)} · 🚶 {formatDistance(walkDistance)} · 🚌{' '}
              {formatDistance(busDistance)} · {Math.max(0, transfers)} transbordo(s)
            </Text>
            {(leg.steps ?? []).map((step, stepIndex) => (
              <View key={`step-${routeIndex}-${stepIndex}`} style={styles.step}>
                <Text style={{ color: theme.text, fontWeight: '600' }}>
                  {step.travel_mode === 'TRANSIT' ? '🚌' : '🚶'}{' '}
                  {step.transit_details?.line?.short_name ||
                    step.transit_details?.line?.name ||
                    step.html_instructions?.replace(/<[^>]+>/g, '') ||
                    step.travel_mode}
                </Text>
                {step.duration?.value ? (
                  <Text style={{ color: theme.muted }}>{formatDuration(step.duration.value)}</Text>
                ) : null}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, marginTop: 8 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  summary: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  step: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
  },
  empty: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  emptyTitle: { fontWeight: '700', fontSize: 16 },
});
