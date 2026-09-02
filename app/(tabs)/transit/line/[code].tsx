import React, { useMemo, useRef, useState, type ElementRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Marker, Polyline } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Bus, CloudOff } from 'lucide-react-native';

import { Screen } from '@/components/Screen';
import { OsmMapView } from '@/components/OsmMapView';
import { EmptyState, LoadingState } from '@/components/ui/StateView';
import { ScreenTopAdBanner } from '@/features/ads/components/ScreenTopAdBanner';
import { useTransitDataset } from '@/features/transit/hooks/useScheduleConfig';
import { fetchLineShape } from '@/lib/api';
import { coordinateToRegion, fitRegionForCoordinates } from '@/lib/island-map';
import type { MapOverlaySpec } from '@/lib/map-overlays';
import { useNetwork } from '@/lib/network-provider';
import { decodePolyline } from '@/lib/polyline';
import { displayRouteNumber } from '@/lib/transit-format';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const LINE_COLOR = '#1e88e5';
const STOP_COLOR = '#0d47a1';
const FOCUS_DELTA = 0.006;

/**
 * A whole bus line, end to end.
 *
 * One direction at a time. Real lines run 42–59 km with 70–127 stops per
 * direction, and drawing both at once puts two near-identical polylines on top
 * of each other with 200+ pins — unreadable, and it hides the thing a rider
 * came to check, which is which way round this line goes.
 */
export default function TransitLineScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { isOnline } = useNetwork();
  const dataset = useTransitDataset();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = params.code ?? '';

  const mapRef = useRef<ElementRef<typeof OsmMapView>>(null);
  const [directionIndex, setDirectionIndex] = useState(0);
  const [focused, setFocused] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ['transit', 'line-shape', code, dataset ?? 'server'],
    queryFn: () => fetchLineShape({ code, dataset }),
    enabled: Boolean(code) && isOnline,
    staleTime: 60 * 60 * 1000,
  });

  const direction = query.data?.directions[directionIndex];

  const path = useMemo(
    () => (direction ? decodePolyline(direction.shape) : []),
    [direction],
  );
  const stops = useMemo(
    () => (direction?.stops ?? []).filter((s) => typeof s.lat === 'number'),
    [direction],
  );
  const region = useMemo(
    () =>
      fitRegionForCoordinates(
        [
          ...path,
          ...stops.map((s) => ({ latitude: s.lat!, longitude: s.lon! })),
        ],
        0.01,
      ),
    [path, stops],
  );

  const androidOverlays = useMemo(
    (): MapOverlaySpec => ({
      markers: stops.map((stop) => ({
        id: `line-stop-${stop.stopId}-${stop.sequence}`,
        latitude: stop.lat!,
        longitude: stop.lon!,
        pinColor: STOP_COLOR,
        size: stop.stopId === focused ? 18 : 10,
        highlighted: stop.stopId === focused,
        title: stop.code ? `${stop.name} · ${stop.code}` : stop.name,
        showLabel: stop.stopId === focused,
        onPress: () => openStop(stop.stopId),
      })),
      polylines: path.length
        ? [{ id: 'line', coordinates: path, strokeColor: LINE_COLOR, strokeWidth: 5 }]
        : [],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stops, path, focused],
  );

  const openStop = (stopId: number) =>
    router.push({
      pathname: '/(tabs)/transit/stop/[stopId]',
      params: { stopId: String(stopId) },
    });

  const focusStop = (stop: { stopId: number; lat?: number; lon?: number }) => {
    setFocused(stop.stopId);
    if (typeof stop.lat === 'number' && typeof stop.lon === 'number') {
      mapRef.current?.animateToRegion(
        coordinateToRegion({ lat: stop.lat, lng: stop.lon }, FOCUS_DELTA),
        350,
      );
    }
  };

  if (!isOnline) {
    return (
      <Screen withStackHeader>
        <EmptyState icon={CloudOff} title={t('transitMapOffline')} />
      </Screen>
    );
  }
  if (query.isLoading) {
    return (
      <Screen withStackHeader>
        <LoadingState />
      </Screen>
    );
  }
  if (!direction) {
    return (
      <Screen withStackHeader>
        <EmptyState icon={Bus} title={t('transitLineNoShape', { line: displayRouteNumber(code) })} />
      </Screen>
    );
  }

  const directions = query.data?.directions ?? [];

  return (
    <Screen withStackHeader>
      <ScreenTopAdBanner slot="transit-line-top" />
      <View style={styles.mapArea}>
        <OsmMapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          androidOverlays={androidOverlays}
          accessibilityLabel={t('transitLineMapA11y', { line: displayRouteNumber(code) })}
        >
          {path.length ? (
            <Polyline coordinates={path} strokeColor={LINE_COLOR} strokeWidth={5} />
          ) : null}
          {Platform.OS === 'ios'
            ? stops.map((stop) => (
                <Marker
                  key={`line-stop-${stop.stopId}-${stop.sequence}`}
                  coordinate={{ latitude: stop.lat!, longitude: stop.lon! }}
                  title={stop.name}
                  description={stop.code}
                  pinColor={STOP_COLOR}
                  onPress={() => openStop(stop.stopId)}
                />
              ))
            : null}
        </OsmMapView>
      </View>

      <View style={[styles.bar, { borderColor: theme.border }]}>
        <View style={[styles.routeBadge, { backgroundColor: theme.primary }]}>
          <Text style={[typography.label, { color: theme.onPrimary }]}>
            {displayRouteNumber(code)}
          </Text>
        </View>
        <Text style={[typography.caption, { color: theme.muted, flex: 1 }]}>
          {t('transitLineStopsCount', { count: stops.length })}
        </Text>
        {directions.length > 1 ? (
          <Pressable
            onPress={() => {
              setDirectionIndex((index) => (index + 1) % directions.length);
              setFocused(null);
            }}
            style={styles.swap}
            accessibilityRole="button"
            accessibilityLabel={t('transitLineSwapDirection')}
          >
            <ArrowLeftRight size={16} color={theme.primary} />
            <Text style={[typography.label, { color: theme.primary }]}>
              {t('transitLineSwapDirection')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {(direction.stops ?? []).map((stop) => (
          <Pressable
            key={`${stop.stopId}-${stop.sequence}`}
            onPress={() => focusStop(stop)}
            onLongPress={() => openStop(stop.stopId)}
            style={[
              styles.row,
              {
                borderBottomColor: theme.border,
                backgroundColor:
                  stop.stopId === focused ? theme.surfaceVariant : 'transparent',
              },
            ]}
          >
            <Text style={[typography.caption, { color: theme.muted, width: 28 }]}>
              {stop.sequence}
            </Text>
            <Text style={[typography.body, { color: theme.text, flex: 1 }]} numberOfLines={1}>
              {stop.name}
            </Text>
            {stop.code ? (
              <Text style={[typography.caption, { color: theme.muted }]}>{stop.code}</Text>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapArea: { flex: 1, minHeight: 200 },
  map: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  routeBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    minWidth: 42,
    alignItems: 'center',
  },
  swap: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  list: { maxHeight: 260, flexShrink: 1 },
  listContent: { paddingHorizontal: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
