import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CloudOff } from 'lucide-react-native';

import { Screen } from '@/components/Screen';
import { OsmMapView } from '@/components/OsmMapView';
import { EmptyState, LoadingState } from '@/components/ui/StateView';
import { useStops } from '@/features/transit/hooks/useTransitQueries';
import {
  CLUSTER_ABOVE_DELTA,
  clusterStops,
  type MapRegionLike,
} from '@/features/transit/lib/stop-clusters';
import { getIslandMapRegion } from '@/lib/island-map';
import type { MapOverlaySpec } from '@/lib/map-overlays';
import { useNetwork } from '@/lib/network-provider';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const STOP_COLOR = '#0d47a1';
const CLUSTER_COLOR = '#1e88e5';

/**
 * Every stop on the island, browsable.
 *
 * Clustered by viewport rather than drawn all at once: 816 stops is far past
 * what the Android Leaflet WebView renders smoothly, and at island zoom they
 * would be an unreadable blob anyway. Zoom in and clusters resolve into stops.
 */
export default function TransitNetworkScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { isOnline } = useNetwork();
  const { data: stops = [], isLoading } = useStops();

  const [region, setRegion] = useState<MapRegionLike>(() => getIslandMapRegion());

  // The picker list carries each stop twice (full name + short-name alias)
  // reusing one id, so dedupe before counting or the map draws doubles.
  const unique = useMemo(() => {
    const seen = new Set<number>();
    return stops.filter((stop) => {
      if (seen.has(stop.id)) {
        return false;
      }
      seen.add(stop.id);
      return true;
    });
  }, [stops]);

  const clusters = useMemo(() => clusterStops(unique, region), [unique, region]);
  const zoomedIn = region.latitudeDelta <= CLUSTER_ABOVE_DELTA;

  const openStop = (stopId: number) =>
    router.push({
      pathname: '/(tabs)/transit/stop/[stopId]',
      params: { stopId: String(stopId) },
    });

  const androidOverlays = useMemo(
    (): MapOverlaySpec => ({
      markers: clusters.map((cluster) => ({
        id: cluster.id,
        latitude: cluster.latitude,
        longitude: cluster.longitude,
        pinColor: cluster.count > 1 ? CLUSTER_COLOR : STOP_COLOR,
        ...(cluster.count > 1 ? { label: String(cluster.count) } : {}),
        size: cluster.count > 1 ? 28 : 12,
        title: cluster.stop?.name,
        ...(cluster.stop
          ? { onPress: () => openStop(cluster.stop!.id) }
          : {}),
      })),
      polylines: [],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clusters],
  );

  if (!isOnline) {
    return (
      <Screen withStackHeader>
        <EmptyState icon={CloudOff} title={t('transitMapOffline')} />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen withStackHeader>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen withStackHeader>
      <View style={styles.fill}>
        <OsmMapView
          style={styles.fill}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
          androidOverlays={androidOverlays}
          accessibilityLabel={t('transitNetworkMapA11y')}
        >
          {Platform.OS === 'ios'
            ? clusters.map((cluster) =>
                cluster.stop ? (
                  <Marker
                    key={cluster.id}
                    coordinate={{
                      latitude: cluster.latitude,
                      longitude: cluster.longitude,
                    }}
                    title={cluster.stop.name}
                    pinColor={STOP_COLOR}
                    onPress={() => openStop(cluster.stop!.id)}
                  />
                ) : (
                  <Marker
                    key={cluster.id}
                    coordinate={{
                      latitude: cluster.latitude,
                      longitude: cluster.longitude,
                    }}
                    anchor={{ x: 0.5, y: 0.5 }}
                  >
                    <View style={[styles.cluster, { backgroundColor: CLUSTER_COLOR }]}>
                      <Text style={styles.clusterLabel}>{cluster.count}</Text>
                    </View>
                  </Marker>
                ),
              )
            : null}
        </OsmMapView>

        <View style={[styles.hint, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[typography.caption, { color: theme.muted }]}>
            {zoomedIn
              ? t('transitNetworkTapStop', { count: unique.length })
              : t('transitNetworkZoomIn', { count: unique.length })}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  cluster: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  clusterLabel: { color: '#fff', fontWeight: '800', fontSize: 12 },
  hint: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    alignItems: 'center',
  },
});
