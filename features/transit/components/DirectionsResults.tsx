import { Bus, Footprints } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { iconSize, space, typography } from '@/lib/tokens';
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
      <Card style={{ marginTop: space.lg }}>
        <Text style={[typography.headline, { color: theme.text }]}>
          {t('noRoutesMessage', { origin, destination })}
        </Text>
        <Text style={[typography.body, { color: theme.muted, marginTop: space.sm }]}>{t('noRoutesSubtitle')}</Text>
      </Card>
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
          <Card key={`route-${routeIndex}`}>
            <Text style={[typography.headline, { color: theme.primary, fontSize: 16 }]}>
              {route.summary || t('directionsButton')} #{routeIndex + 1}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[typography.caption, { color: theme.muted }]}>
                {formatDuration(leg.duration?.value ?? 0)}
              </Text>
              <Footprints size={iconSize.sm} color={theme.muted} />
              <Text style={[typography.caption, { color: theme.muted }]}>
                {formatDistance(walkDistance)}
              </Text>
              <Bus size={iconSize.sm} color={theme.muted} />
              <Text style={[typography.caption, { color: theme.muted }]}>
                {formatDistance(busDistance)} · {Math.max(0, transfers)} {t('transfer', { count: Math.max(0, transfers) })}
              </Text>
            </View>
            {(leg.steps ?? []).map((step, stepIndex) => {
              const isTransit = step.travel_mode === 'TRANSIT';
              const StepIcon = isTransit ? Bus : Footprints;
              return (
                <View
                  key={`step-${routeIndex}-${stepIndex}`}
                  style={[styles.step, { borderTopColor: theme.border }]}
                >
                  <View style={styles.stepRow}>
                    <StepIcon size={iconSize.md} color={theme.primary} strokeWidth={2} />
                    <Text style={[typography.bodyStrong, { color: theme.text, flex: 1 }]}>
                      {step.transit_details?.line?.short_name ||
                        step.transit_details?.line?.name ||
                        step.html_instructions?.replace(/<[^>]+>/g, '') ||
                        (isTransit ? t('transitBusLabel') : t('transitWalkLabel'))}
                    </Text>
                  </View>
                  {step.duration?.value ? (
                    <Text style={[typography.caption, { color: theme.muted, marginLeft: 28 }]}>
                      {formatDuration(step.duration.value)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md, marginTop: space.sm },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs, marginVertical: space.sm },
  step: { paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
