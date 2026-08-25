import React, { useMemo, useRef, useState, type ElementRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/ui/StateView';
import { ChevronDown, ChevronRight, Map as MapIcon } from 'lucide-react-native';
import { JourneyMap } from '@/features/transit/components/JourneyMap';
import {
  buildJourneyMapData,
  groupJourneySteps,
  type JourneyMapPin,
} from '@/features/transit/lib/journey-map-data';
import { useJourneyGeometry } from '@/features/transit/hooks/useJourneyGeometry';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import { displayRouteNumber } from '@/lib/transit-format';
import type { TransitJourney } from '@/lib/types';

/**
 * Full-screen map for one journey.
 *
 * The journey arrives through the React Query cache rather than the URL: an
 * itinerary with two legs and every stop is far too big to serialise into route
 * params, and it is already sitting in the cache the results list rendered from.
 */
export default function TransitMapScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ journeyId?: string }>();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [selected, setSelected] = useState<JourneyMapPin | null>(null);
  // Collapsed by default: the decisions come first, the ride detail on demand.
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const mapRef = useRef<ElementRef<typeof JourneyMap>>(null);

  const journey = useMemo((): TransitJourney | null => {
    if (!params.journeyId) {
      return null;
    }
    // Every cached search result, newest first — the same journey can appear in
    // more than one search and any copy of it is equivalent.
    const caches = queryClient.getQueriesData<{ journeys?: TransitJourney[] }>({
      queryKey: ['transit', 'search'],
    });
    for (const [, value] of caches) {
      const found = value?.journeys?.find((j) => j.id === params.journeyId);
      if (found) {
        return found;
      }
    }
    return null;
  }, [params.journeyId, queryClient]);

  const { geometries } = useJourneyGeometry(journey);
  const data = useMemo(
    () => (journey ? buildJourneyMapData(journey, geometries) : null),
    [journey, geometries],
  );

  if (!journey) {
    return (
      <Screen withStackHeader>
        <EmptyState
          icon={MapIcon}
          title={t('transitMapUnavailable')}
          description={t('transitMapReopenSearch')}
        />
      </Screen>
    );
  }

  const groups = data ? groupJourneySteps(data.pins) : [];

  const openStop = (stopId: number) =>
    router.push({
      pathname: '/(tabs)/transit/stop/[stopId]',
      params: { stopId: String(stopId) },
    });

  /**
   * Two stages, because one tap cannot mean both "which one is that?" and
   * "take me there".
   *
   *   first tap   select it and zoom the map in on it — answers "where is this
   *               exactly", which is what someone scanning a route wants
   *   tap again   open the stop page, now that they have confirmed it is the
   *               one they meant
   *
   * The same handler drives the map pins and the list rows, so a stop behaves
   * identically wherever it is touched.
   */
  const selectOrOpen = (pin: JourneyMapPin) => {
    if (selected?.stopId === pin.stopId) {
      openStop(pin.stopId);
      return;
    }
    setSelected(pin);
    mapRef.current?.focusStop(pin);
  };

  const toggleGroup = (id: string) =>
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  return (
    <Screen withStackHeader>
      <View style={styles.mapArea}>
        <JourneyMap
          ref={mapRef}
          journey={journey}
          variant="full"
          highlightedStopId={selected?.stopId ?? null}
          onStopPress={selectOrOpen}
        />
      </View>

      <ScrollView style={styles.steps} contentContainerStyle={styles.stepsContent}>
        {groups.map((group) => {
          if (group.kind === 'action') {
            const pin = group.pin;
            const active = pin.stopId === selected?.stopId;
            return (
              <Pressable
                key={pin.id}
                onPress={() => selectOrOpen(pin)}
                onLongPress={() => openStop(pin.stopId)}
                accessibilityHint={
                  active ? t('transitTapAgainOpensStop') : undefined
                }
                style={[
                  styles.step,
                  {
                    backgroundColor: active ? theme.surfaceVariant : 'transparent',
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={[styles.stepDot, { backgroundColor: pin.color }]}>
                  <Text style={styles.stepNumber}>{pin.step}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: theme.text }]}>{pin.name}</Text>
                  <Text style={[typography.caption, { color: theme.muted }]}>
                    {pin.time}
                    {pin.code ? ` \u00b7 ${pin.code}` : ''}
                  </Text>
                  {active ? (
                    <Text style={[typography.caption, { color: theme.primary }]}>
                      {t('transitTapAgainOpensStop')}
                    </Text>
                  ) : null}
                </View>
                <Text style={[typography.caption, { color: theme.muted }]}>
                  {t(
                    pin.kind === 'board'
                      ? 'transitPinBoard'
                      : pin.kind === 'change'
                        ? 'transitPinChange'
                        : 'transitPinAlight',
                  )}
                </Text>
              </Pressable>
            );
          }

          // The stops the bus merely passes: folded away by default, still
          // reachable — they are how a rider knows whether they have gone past.
          const open = openGroups.has(group.id);
          const Chevron = open ? ChevronDown : ChevronRight;
          return (
            <View key={group.id}>
              <Pressable
                onPress={() => toggleGroup(group.id)}
                style={styles.groupToggle}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
              >
                <View style={styles.rail}>
                  <View style={[styles.railLine, { backgroundColor: group.pins[0].color }]} />
                </View>
                <Chevron size={14} color={theme.muted} />
                <Text style={[typography.caption, { color: theme.muted }]}>
                  {t('transitStopsCount', { count: group.pins.length })}
                </Text>
              </Pressable>

              {open
                ? group.pins.map((pin) => (
                    <Pressable
                      key={pin.id}
                      onPress={() => selectOrOpen(pin)}
                      onLongPress={() => openStop(pin.stopId)}
                      accessibilityHint={
                        pin.stopId === selected?.stopId
                          ? t('transitTapAgainOpensStop')
                          : undefined
                      }
                      style={styles.subStop}
                    >
                      <View style={styles.rail}>
                        <View style={[styles.railLine, { backgroundColor: pin.color }]} />
                        <View
                          style={[
                            styles.subDot,
                            {
                              backgroundColor:
                                pin.stopId === selected?.stopId ? pin.color : theme.surface,
                              borderColor: pin.color,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[typography.caption, { color: theme.muted, flex: 1 }]}
                        numberOfLines={1}
                      >
                        {pin.name}
                      </Text>
                      <Text style={[typography.caption, { color: theme.muted }]}>{pin.time}</Text>
                    </Pressable>
                  ))
                : null}
            </View>
          );
        })}
      </ScrollView>

    </Screen>
  );
}

export const journeyRouteLabel = (journey: TransitJourney) =>
  journey.legs
    .filter((leg) => leg.kind === 'ride')
    .map((leg) => displayRouteNumber((leg as { route: string }).route))
    .join(' → ');

const styles = StyleSheet.create({
  mapArea: { flex: 1, minHeight: 260 },
  steps: { maxHeight: 240 },
  stepsContent: { padding: space.md, gap: space.xs },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: { color: '#fff', fontWeight: '800', fontSize: 12 },
  groupToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.xs,
  },
  subStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: 3,
  },
  // A continuous rail under the numbered pins, so the folded-away stops read as
  // part of the same ride rather than a detached list.
  rail: { width: 26, alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center' },
  railLine: { position: 'absolute', top: 0, bottom: 0, width: 2, opacity: 0.35 },
  subDot: { width: 7, height: 7, borderRadius: 4, borderWidth: 1.5 },
});
