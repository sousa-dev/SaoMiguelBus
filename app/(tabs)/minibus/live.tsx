import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/StateView';
import { MinibusLiveLineFilter } from '@/features/minibus/components/MinibusLiveLineFilter';
import {
  MinibusLiveMap,
  type MinibusLiveMapHandle,
} from '@/features/minibus/components/MinibusLiveMap';
import { MinibusTrackingFreshness } from '@/features/minibus/components/MinibusTrackingFreshness';
import { MinibusTrackingUnavailable } from '@/features/minibus/components/MinibusTrackingUnavailable';
import { MinibusLiveStopSheet } from '@/features/minibus/components/MinibusLiveStopSheet';
import { MinibusVehicleSheet } from '@/features/minibus/components/MinibusVehicleSheet';
import { useMinibusOffline } from '@/features/minibus/hooks/useMinibusOffline';
import {
  isMinibusTrackingAvailable,
  useMinibusTrackingHealth,
} from '@/features/minibus/hooks/useMinibusTrackingHealth';
import { useMinibusLines, useMinibusNetwork } from '@/features/minibus/hooks/useMinibusQueries';
import { useMinibusScreenActive } from '@/features/minibus/hooks/useMinibusScreenActive';
import {
  useMinibusVehicleDetail,
  useMinibusVehicles,
} from '@/features/minibus/hooks/useMinibusTrackingQueries';
import {
  filterVehiclesByLineSlug,
  resolveLineForVehicle,
  vehicleLineColorHex,
} from '@/features/minibus/lib/vehicleColor';
import {
  findLiveMapStopPin,
  liveFocusedVehicleMapStops,
  liveNetworkMapStops,
  vehicleCurrentStopKey,
} from '@/features/minibus/lib/liveNetworkMapStops';
import { liveJourneyStopsFromCirculations } from '@/features/minibus/lib/liveJourneyStops';
import { MINIBUS_LIVE_VEHICLE_SHEET_HEIGHT_RATIO } from '@/features/minibus/lib/liveVehicleSheetLayout';
import { track } from '@/lib/analytics';
import { decodePolyline } from '@/lib/polyline';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const TRY_AGAIN_COOLDOWN_MS = 5000;

export default function MinibusLiveScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const vehicleSheetHeight = Math.round(windowHeight * MINIBUS_LIVE_VEHICLE_SHEET_HEIGHT_RATIO);
  const params = useLocalSearchParams<{ line?: string }>();
  const initialLineSlug = typeof params.line === 'string' ? params.line : null;

  const screenActive = useMinibusScreenActive();
  const [selectedLineSlug, setSelectedLineSlug] = useState<string | null>(initialLineSlug);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedStopKey, setSelectedStopKey] = useState<string | null>(null);
  const [hideStops, setHideStops] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const mapRef = useRef<MinibusLiveMapHandle>(null);

  const healthQuery = useMinibusTrackingHealth({ enabled: screenActive });
  const trackingAvailable = isMinibusTrackingAvailable(healthQuery.data);

  const linesQuery = useMinibusLines(trackingAvailable);
  const lines = linesQuery.data?.lines ?? [];

  const { snapshot } = useMinibusOffline();
  const offlineNetwork = snapshot?.bundle?.network ?? null;
  const networkQuery = useMinibusNetwork(trackingAvailable && !offlineNetwork);
  const network = offlineNetwork ?? networkQuery.data ?? null;

  const fleetQuery = useMinibusVehicles({
    enabled: screenActive && trackingAvailable,
    screenActive: screenActive && trackingAvailable,
  });

  const detailQuery = useMinibusVehicleDetail(selectedVehicleId, {
    enabled: screenActive && trackingAvailable && selectedVehicleId != null,
    screenActive: screenActive && trackingAvailable && selectedVehicleId != null,
  });

  useFocusEffect(
    useCallback(() => {
      track('minibus', 'view', { screen: 'live' });
      void healthQuery.refetch();
      return () => {
        setSelectedVehicleId(null);
        setSelectedStopKey(null);
      };
    }, [healthQuery.refetch]),
  );

  useEffect(() => {
    if (initialLineSlug) {
      setSelectedLineSlug(initialLineSlug);
    }
  }, [initialLineSlug]);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) {
      setCooldownSeconds(0);
      return;
    }

    const tick = () => {
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      setCooldownSeconds(Math.max(0, remaining));
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const vehicles = useMemo(() => {
    const fleet = fleetQuery.data?.vehicles ?? [];
    return filterVehiclesByLineSlug(fleet, lines, selectedLineSlug);
  }, [fleetQuery.data?.vehicles, lines, selectedLineSlug]);

  const selectedVehicle = detailQuery.data?.vehicle ?? null;
  const routePolyline = useMemo(() => {
    const shape = selectedVehicle?.journey?.shape;
    if (shape) {
      const decoded = decodePolyline(shape);
      if (decoded.length > 1) {
        return decoded;
      }
    }
    const stops = liveJourneyStopsFromCirculations(selectedVehicle?.journey?.circulations);
    const fromStops = stops
      .filter(
        (stop) => typeof stop.latitude === 'number' && typeof stop.longitude === 'number',
      )
      .map((stop) => ({
        latitude: stop.latitude as number,
        longitude: stop.longitude as number,
      }));
    return fromStops.length > 1 ? fromStops : undefined;
  }, [selectedVehicle?.journey?.circulations, selectedVehicle?.journey?.shape]);

  const routeColor = useMemo(() => {
    const vehicle =
      selectedVehicle ??
      (selectedVehicleId
        ? fleetQuery.data?.vehicles.find((row) => row.id === selectedVehicleId) ?? null
        : null);
    if (!vehicle) {
      return null;
    }
    return vehicleLineColorHex(vehicle, lines);
  }, [fleetQuery.data?.vehicles, lines, selectedVehicle, selectedVehicleId]);

  const networkStops = useMemo(
    () => liveNetworkMapStops(network, lines, selectedLineSlug),
    [lines, network, selectedLineSlug],
  );

  const focusedVehicle =
    selectedVehicle ??
    (selectedVehicleId
      ? fleetQuery.data?.vehicles.find((row) => row.id === selectedVehicleId) ?? null
      : null);
  const focusedLine = focusedVehicle ? resolveLineForVehicle(focusedVehicle, lines) : null;

  const mapVehicles = useMemo(() => {
    if (!selectedVehicleId) {
      return vehicles;
    }
    return focusedVehicle ? [focusedVehicle] : [];
  }, [focusedVehicle, selectedVehicleId, vehicles]);

  const mapNetworkStops = useMemo(() => {
    if (selectedVehicleId && focusedLine) {
      return liveFocusedVehicleMapStops(
        network,
        lines,
        focusedLine.slug,
        routeColor ?? focusedLine.color,
        selectedVehicle?.journey?.circulations,
      );
    }
    if (hideStops) {
      return [];
    }
    return networkStops;
  }, [
    focusedLine,
    hideStops,
    lines,
    network,
    networkStops,
    routeColor,
    selectedVehicle?.journey?.circulations,
    selectedVehicleId,
  ]);

  const showMapStops = !hideStops || selectedVehicleId != null;

  const vehicleLine = focusedLine;
  const autoHighlightedStopKey = vehicleCurrentStopKey(
    mapNetworkStops,
    vehicleLine?.slug,
    selectedVehicle?.currentStopSequence,
  );
  const highlightedStopKey = selectedStopKey ?? autoHighlightedStopKey;
  const selectedStopPin = findLiveMapStopPin(mapNetworkStops, selectedStopKey ?? '');

  const fitMapToSelectedVehicle = useCallback(() => {
    if (!selectedVehicleId) {
      return;
    }
    const vehicle =
      selectedVehicle ??
      fleetQuery.data?.vehicles.find((row) => row.id === selectedVehicleId) ??
      null;
    if (!vehicle) {
      return;
    }
    mapRef.current?.fitVehicleRoute({
      vehicle,
      routePolyline,
      bottomInset: vehicleSheetHeight,
    });
  }, [
    fleetQuery.data?.vehicles,
    routePolyline,
    selectedVehicle,
    selectedVehicleId,
    vehicleSheetHeight,
  ]);

  useEffect(() => {
    if (!selectedVehicleId) {
      return;
    }
    const timer = setTimeout(() => {
      fitMapToSelectedVehicle();
    }, 150);
    return () => clearTimeout(timer);
  }, [fitMapToSelectedVehicle, selectedVehicleId]);

  const onVehiclePress = (vehicleId: string) => {
    setSelectedStopKey(null);
    setSelectedVehicleId(vehicleId);
    track('minibus', 'live_select', { vehicle_id: vehicleId });
  };

  const onStopPress = (stopKey: string) => {
    if (hideStops && !selectedVehicleId) {
      return;
    }
    setSelectedVehicleId(null);
    setSelectedStopKey(stopKey);
    track('minibus', 'live_select', { stop_key: stopKey });
    const pin = findLiveMapStopPin(mapNetworkStops, stopKey);
    if (pin) {
      requestAnimationFrame(() => {
        mapRef.current?.centerOnStop(pin.stop);
      });
    }
  };

  const onHideStopsChange = (next: boolean) => {
    setHideStops(next);
    if (next) {
      setSelectedStopKey(null);
    }
    track('minibus', 'live_toggle', { hide_stops: next });
  };

  const onSelectLineSlug = (slug: string | null) => {
    setSelectedLineSlug(slug);
    track('minibus', 'live_filter', { line_slug: slug ?? 'all' });
  };

  const onTryAgain = () => {
    if (cooldownUntil > Date.now()) {
      return;
    }
    setCooldownUntil(Date.now() + TRY_AGAIN_COOLDOWN_MS);
    void healthQuery.refetchHealth({ force: true });
  };

  const tryAgainLabel =
    cooldownSeconds > 0
      ? t('minibusLiveTryAgainWait', { seconds: cooldownSeconds })
      : t('minibusLiveTryAgain');

  if (healthQuery.isLoading && healthQuery.data == null) {
    return (
      <Screen withStackHeader>
        <LoadingState />
      </Screen>
    );
  }

  if (!trackingAvailable) {
    return (
      <Screen withStackHeader>
        <MinibusTrackingUnavailable
          onTryAgain={onTryAgain}
          tryAgainDisabled={cooldownSeconds > 0 || healthQuery.isFetching}
          tryAgainLabel={tryAgainLabel}
          loading={healthQuery.isFetching}
        />
      </Screen>
    );
  }

  return (
    <Screen withStackHeader edges={['left', 'right']}>
      <View style={styles.container}>
        <View style={styles.filterWrap}>
          <MinibusLiveLineFilter
            lines={lines}
            selectedLineSlug={selectedLineSlug}
            onSelectLineSlug={onSelectLineSlug}
          />
          {fleetQuery.data?.stale ? (
            <Badge label={t('minibusLiveStale')} tone="accent" size="compact" />
          ) : null}
        </View>

        <MinibusTrackingFreshness
          meta={fleetQuery.data}
          isFetching={fleetQuery.isFetching}
        />

        <View style={styles.mapWrap}>
          <MinibusLiveMap
            ref={mapRef}
            vehicles={mapVehicles}
            lines={lines}
            networkStops={mapNetworkStops}
            showStops={showMapStops}
            hideStops={hideStops}
            onHideStopsChange={onHideStopsChange}
            showStopsToggle={selectedVehicleId == null}
            routePolyline={routePolyline}
            routeColor={routeColor}
            highlightedStopKey={highlightedStopKey}
            onVehiclePress={onVehiclePress}
            onStopPress={onStopPress}
          />
          {fleetQuery.isFetching && !fleetQuery.data ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : null}
          {vehicles.length === 0 && fleetQuery.data && !fleetQuery.isFetching && !selectedVehicleId ? (
            <View style={[styles.emptyBanner, { backgroundColor: theme.surface }]}>
              <Text style={[typography.body, { color: theme.muted }]}>{t('minibusLiveEmpty')}</Text>
            </View>
          ) : null}
          <MinibusVehicleSheet
            docked
            visible={selectedVehicleId != null}
            vehicle={selectedVehicle}
            lines={lines}
            trackingMeta={detailQuery.data ?? fleetQuery.data}
            isFetching={detailQuery.isFetching}
            onClose={() => setSelectedVehicleId(null)}
          />
        </View>
      </View>

      <MinibusLiveStopSheet
        visible={selectedStopKey != null && showMapStops}
        pin={selectedStopPin}
        onClose={() => setSelectedStopKey(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.sm,
    gap: space.sm,
  },
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  emptyBanner: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.lg,
    padding: space.md,
    borderRadius: 12,
  },
});
