import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/StateView';
import { MinibusLiveFleetBar } from '@/features/minibus/components/MinibusLiveFleetBar';
import { MinibusLiveLineFilter } from '@/features/minibus/components/MinibusLiveLineFilter';
import {
  MinibusLiveMap,
  type MinibusLiveMapHandle,
} from '@/features/minibus/components/MinibusLiveMap';
import { MinibusTrackingFreshness } from '@/features/minibus/components/MinibusTrackingFreshness';
import { MinibusTrackingUnavailable } from '@/features/minibus/components/MinibusTrackingUnavailable';
import { MinibusLiveStopSheet } from '@/features/minibus/components/MinibusLiveStopSheet';
import { MinibusVehicleSheet } from '@/features/minibus/components/MinibusVehicleSheet';
import { useInAppReviewConfig } from '@/features/app-review/hooks/useInAppReviewConfig';
import { maybeRequestAppReview } from '@/features/app-review/lib/maybe-request-app-review';
import { useMinibusOffline } from '@/features/minibus/hooks/useMinibusOffline';
import {
  isMinibusTrackingAvailable,
  useMinibusTrackingHealth,
} from '@/features/minibus/hooks/useMinibusTrackingHealth';
import { useMinibusLines, useMinibusLine, useMinibusNetwork } from '@/features/minibus/hooks/useMinibusQueries';
import { useMinibusFleetVehicleDetails } from '@/features/minibus/hooks/useMinibusFleetVehicleDetails';
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
import {
  liveFilteredLineColor,
  liveFilteredLineRoutePolyline,
} from '@/features/minibus/lib/liveFilteredLineRoute';
import { MINIBUS_LIVE_FLEET_BAR_OVERVIEW_BOTTOM_INSET } from '@/features/minibus/lib/liveVehicleSheetLayout';
import { track } from '@/lib/analytics';
import { useNetwork } from '@/lib/network-provider';
import { decodePolyline } from '@/lib/polyline';
import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const TRY_AGAIN_COOLDOWN_MS = 5000;
const LIVE_REVIEW_ENGAGEMENT_MS = 15000;

export default function MinibusLiveScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ line?: string }>();
  const initialLineSlug = typeof params.line === 'string' ? params.line : null;

  const screenActive = useMinibusScreenActive();
  const { isOnline } = useNetwork();
  const [selectedLineSlug, setSelectedLineSlug] = useState<string | null>(initialLineSlug);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const busFocused = selectedVehicleId != null;
  const [selectedStopKey, setSelectedStopKey] = useState<string | null>(null);
  const [sheetHighlightSequence, setSheetHighlightSequence] = useState<number | null>(null);
  const [hideStops, setHideStops] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const mapRef = useRef<MinibusLiveMapHandle>(null);
  const prevSelectedVehicleIdRef = useRef<string | null>(null);
  const liveReviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviewConfig = useInAppReviewConfig();

  const healthQuery = useMinibusTrackingHealth({ enabled: screenActive && isOnline });
  const trackingAvailable = isOnline && isMinibusTrackingAvailable(healthQuery.data);

  const linesQuery = useMinibusLines(trackingAvailable);
  const lines = linesQuery.data?.lines ?? [];
  const lineFilterActive = selectedLineSlug != null && selectedVehicleId == null;
  const filteredLineQuery = useMinibusLine(selectedLineSlug ?? '', lineFilterActive && trackingAvailable);

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
        if (liveReviewTimerRef.current) {
          clearTimeout(liveReviewTimerRef.current);
          liveReviewTimerRef.current = null;
        }
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

  useEffect(() => {
    if (liveReviewTimerRef.current) {
      clearTimeout(liveReviewTimerRef.current);
      liveReviewTimerRef.current = null;
    }

    if (!screenActive || !trackingAvailable || vehicles.length === 0 || !reviewConfig.enabled) {
      return;
    }

    liveReviewTimerRef.current = setTimeout(() => {
      void maybeRequestAppReview({
        trigger: 'minibus_live_engaged',
        inAppReviewEnabled: reviewConfig.enabled,
        storeUrls: reviewConfig.storeUrls,
      });
    }, LIVE_REVIEW_ENGAGEMENT_MS);

    return () => {
      if (liveReviewTimerRef.current) {
        clearTimeout(liveReviewTimerRef.current);
        liveReviewTimerRef.current = null;
      }
    };
  }, [
    reviewConfig.enabled,
    reviewConfig.storeUrls,
    screenActive,
    trackingAvailable,
    vehicles.length,
  ]);

  const fleetVehicleIds = useMemo(() => vehicles.map((vehicle) => vehicle.id), [vehicles]);
  const { detailsById: fleetVehicleDetailsById } = useMinibusFleetVehicleDetails(
    fleetVehicleIds,
    {
      enabled: screenActive && trackingAvailable,
      screenActive: screenActive && trackingAvailable,
    },
  );

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

  const lineRouteSources = useMemo(
    () => ({
      lineQuery: filteredLineQuery.data,
      linesList: lines,
      offlineLines: snapshot?.bundle?.lines,
    }),
    [filteredLineQuery.data, lines, snapshot?.bundle?.lines],
  );

  const filteredLineRoutePolyline = useMemo(
    () =>
      lineFilterActive
        ? liveFilteredLineRoutePolyline(network, selectedLineSlug, lineRouteSources)
        : undefined,
    [lineFilterActive, lineRouteSources, network, selectedLineSlug],
  );

  const mapRoutePolyline = routePolyline ?? filteredLineRoutePolyline;

  const mapRouteColor = useMemo(() => {
    if (routeColor) {
      return routeColor;
    }
    if (!lineFilterActive) {
      return null;
    }
    return liveFilteredLineColor(selectedLineSlug, lineRouteSources);
  }, [lineFilterActive, lineRouteSources, routeColor, selectedLineSlug]);

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
  const sheetHighlightedStopKey = useMemo(
    () =>
      vehicleCurrentStopKey(mapNetworkStops, vehicleLine?.slug, sheetHighlightSequence ?? undefined),
    [mapNetworkStops, sheetHighlightSequence, vehicleLine?.slug],
  );
  const highlightedStopKey =
    sheetHighlightedStopKey ?? selectedStopKey ?? autoHighlightedStopKey;
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
      bottomInset: 0,
    });
  }, [
    fleetQuery.data?.vehicles,
    routePolyline,
    selectedVehicle,
    selectedVehicleId,
  ]);

  const fitMapToLiveOverview = useCallback(() => {
    mapRef.current?.fitLiveOverview({
      bottomInset: MINIBUS_LIVE_FLEET_BAR_OVERVIEW_BOTTOM_INSET,
    });
  }, []);

  useEffect(() => {
    const wasSelected = prevSelectedVehicleIdRef.current != null;
    prevSelectedVehicleIdRef.current = selectedVehicleId;

    const timer = setTimeout(() => {
      if (selectedVehicleId) {
        fitMapToSelectedVehicle();
        return;
      }
      if (wasSelected) {
        fitMapToLiveOverview();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [fitMapToLiveOverview, fitMapToSelectedVehicle, selectedVehicleId]);

  const onVehiclePress = (vehicleId: string) => {
    setSelectedStopKey(null);
    setSheetHighlightSequence(null);
    setSelectedVehicleId(vehicleId);
    track('minibus', 'live_select', { vehicle_id: vehicleId });
  };

  const onVehicleSheetStopPress = useCallback(
    (sequence: number) => {
      setSheetHighlightSequence(sequence);
      const stopKey = vehicleCurrentStopKey(mapNetworkStops, vehicleLine?.slug, sequence);
      const pin = stopKey ? findLiveMapStopPin(mapNetworkStops, stopKey) : null;
      if (pin) {
        requestAnimationFrame(() => {
          mapRef.current?.centerOnStop(pin.stop);
        });
      }
      track('minibus', 'live_select', { stop_sequence: sequence, source: 'vehicle_sheet' });
    },
    [mapNetworkStops, vehicleLine?.slug],
  );

  useEffect(() => {
    setSheetHighlightSequence(null);
  }, [selectedVehicleId]);

  const onStopPress = (stopKey: string) => {
    if (hideStops && !selectedVehicleId) {
      return;
    }
    setSheetHighlightSequence(null);
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

  if (!isOnline) {
    return (
      <Screen withStackHeader>
        <MinibusTrackingUnavailable variant="offline" />
      </Screen>
    );
  }

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
        {!busFocused ? (
          <>
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
          </>
        ) : null}

        <View style={styles.mapWrap}>
          <MinibusLiveMap
            ref={mapRef}
            vehicles={mapVehicles}
            lines={lines}
            networkStops={mapNetworkStops}
            showStops={showMapStops}
            hideStops={hideStops}
            onHideStopsChange={onHideStopsChange}
            showStopsToggle={!busFocused}
            routePolyline={mapRoutePolyline}
            routeColor={mapRouteColor}
            highlightedStopKey={highlightedStopKey}
            onVehiclePress={onVehiclePress}
            onStopPress={onStopPress}
          />
          {fleetQuery.isFetching && !fleetQuery.data ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : null}
        </View>

        {busFocused ? (
          <MinibusVehicleSheet
            docked
            inline
            compact
            visible
            vehicle={selectedVehicle}
            lines={lines}
            trackingMeta={detailQuery.data ?? fleetQuery.data}
            isFetching={detailQuery.isFetching}
            highlightedStopSequence={sheetHighlightSequence}
            onStopPress={onVehicleSheetStopPress}
            onClose={() => setSelectedVehicleId(null)}
          />
        ) : null}

        <MinibusLiveFleetBar
          vehicles={vehicles}
          lines={lines}
          vehicleDetailsById={fleetVehicleDetailsById}
          selectedVehicleId={selectedVehicleId}
          onVehiclePress={onVehiclePress}
          onClearVehicle={() => setSelectedVehicleId(null)}
          compact={busFocused}
        />
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
});
