import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { LoadingState } from '@/components/ui/StateView';
import { Search } from 'lucide-react-native';
import { ScreenTopAdBanner } from '@/features/ads/components/ScreenTopAdBanner';
import { AzoresbusLiveFleetBar } from '@/features/azoresbus/components/AzoresbusLiveFleetBar';
import { AzoresbusLineSelect } from '@/features/azoresbus/components/AzoresbusLineSelect';
import { AzoresbusStopSearchSheet } from '@/features/azoresbus/components/AzoresbusStopSearchSheet';
import {
  AzoresbusLiveMap,
  type AzoresbusLiveMapHandle,
} from '@/features/azoresbus/components/AzoresbusLiveMap';
import { AzoresbusTrackingFreshness } from '@/features/azoresbus/components/AzoresbusTrackingFreshness';
import { AzoresbusTrackingUnavailable } from '@/features/azoresbus/components/AzoresbusTrackingUnavailable';
import { AzoresbusVehicleSheet } from '@/features/azoresbus/components/AzoresbusVehicleSheet';
import {
  isAzoresbusTrackingAvailable,
  useAzoresbusTrackingHealth,
} from '@/features/azoresbus/hooks/useAzoresbusTrackingHealth';
import {
  useAzoresbusVehicleDetail,
  useAzoresbusVehicles,
} from '@/features/azoresbus/hooks/useAzoresbusTrackingQueries';
import {
  trackAzoresbusView,
  trackLiveFilter,
  trackLiveHealth,
  trackLiveSelectStop,
  trackLiveSelectVehicle,
  trackLiveStopSearch,
} from '@/features/azoresbus/lib/live-analytics';
import {
  azoresbusFleetLines,
  filterVehiclesByLineCodes,
} from '@/features/azoresbus/lib/vehicleLine';
import { useLiveScreenActivity } from '@/features/live-tracking/hooks/useLiveScreenActivity';
import { useLiveTrackingDevStore } from '@/features/live-tracking/lib/live-tracking-dev-store';
import { useStops } from '@/features/transit/hooks/useTransitQueries';
import { decodePolyline } from '@/lib/polyline';
import { useNetwork } from '@/lib/network-provider';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const TRY_AGAIN_COOLDOWN_MS = 5000;

export default function AzoresbusLiveScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ line?: string; vehicle?: string }>();
  const router = useRouter();
  const { isOnline } = useNetwork();
  const { navFocused, pollingActive } = useLiveScreenActivity();
  const mapRef = useRef<AzoresbusLiveMapHandle>(null);

  const initialLine = typeof params.line === 'string' && params.line ? params.line : null;
  // A `?line=` deep link seeds the selection rather than bypassing it, so the
  // filter UI shows what the link did.
  const [selectedLineCodes, setSelectedLineCodes] = useState<string[]>(
    initialLine ? [initialLine] : [],
  );
  // Arriving from a stop's arrivals list: open focused on that bus.
  const initialVehicle =
    typeof params.vehicle === 'string' && params.vehicle ? params.vehicle : null;
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    initialVehicle,
  );
  const centredOnDeepLink = useRef(false);
  const [stopSearchOpen, setStopSearchOpen] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const { data: stops = [] } = useStops();
  const healthQuery = useAzoresbusTrackingHealth({ enabled: navFocused && isOnline });
  const forceLiveTrackingUnavailable = useLiveTrackingDevStore((s) => s.forceUnavailable);
  const trackingAvailable =
    isOnline && isAzoresbusTrackingAvailable(healthQuery.data) && !forceLiveTrackingUnavailable;
  const queriesEnabled = navFocused && trackingAvailable;

  const fleetQuery = useAzoresbusVehicles({
    enabled: queriesEnabled,
    screenActive: pollingActive && trackingAvailable,
  });
  const detailQuery = useAzoresbusVehicleDetail(selectedVehicleId, {
    enabled: queriesEnabled && selectedVehicleId != null,
    screenActive: pollingActive && trackingAvailable && selectedVehicleId != null,
  });

  const vehicles = useMemo(() => fleetQuery.data?.vehicles ?? [], [fleetQuery.data]);
  const fleetLines = useMemo(() => azoresbusFleetLines(vehicles), [vehicles]);
  const visibleVehicles = useMemo(
    () => filterVehiclesByLineCodes(vehicles, selectedLineCodes),
    [selectedLineCodes, vehicles],
  );

  // The selected bus's own journey shape, decoded only for that one vehicle —
  // every vehicle carries a multi-kilobyte polyline and decoding the fleet's
  // worth every poll would be pure waste.
  const routePolyline = useMemo(() => {
    const shape = detailQuery.data?.journey?.shape;
    if (!shape) {
      return undefined;
    }
    const points = decodePolyline(shape);
    return points.length > 1 ? points : undefined;
  }, [detailQuery.data?.journey?.shape]);

  useEffect(() => {
    if (navFocused) {
      trackAzoresbusView('live');
    }
  }, [navFocused]);

  useEffect(() => {
    if (initialLine) {
      trackLiveFilter('deep_link', initialLine);
    }
  }, [initialLine]);

  /**
   * Centre on a deep-linked bus once the fleet actually arrives.
   *
   * The map cannot fly to a vehicle it has not been told about yet, and the
   * fleet lands a beat after the screen mounts. Guarded so a later poll does not
   * yank the map back after the rider has panned away.
   */
  useEffect(() => {
    if (!initialVehicle || centredOnDeepLink.current || vehicles.length === 0) {
      return;
    }
    const vehicle = vehicles.find((item) => item.id === initialVehicle);
    if (!vehicle) {
      return;
    }
    centredOnDeepLink.current = true;
    trackLiveSelectVehicle('deep_link', { vehicle: initialVehicle });
    mapRef.current?.centerOnVehicle(vehicle);
  }, [initialVehicle, vehicles]);

  // Countdown for the retry button, so it reads as "wait" rather than "broken".
  useEffect(() => {
    if (cooldownUntil === 0) {
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSeconds(remaining);
      if (remaining === 0) {
        setCooldownUntil(0);
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const onTryAgain = useCallback(() => {
    trackLiveHealth('retry');
    setCooldownUntil(Date.now() + TRY_AGAIN_COOLDOWN_MS);
    void healthQuery.refetchHealth({ force: true });
  }, [healthQuery]);

  const onSelectVehicle = useCallback(
    (vehicleId: string, source: 'map' | 'fleet_bar') => {
      setSelectedVehicleId(vehicleId);
      trackLiveSelectVehicle(source, { vehicle: vehicleId });
      const vehicle = vehicles.find((item) => item.id === vehicleId);
      if (vehicle) {
        mapRef.current?.centerOnVehicle(vehicle);
      }
    },
    [vehicles],
  );

  if (!isOnline) {
    return (
      <Screen withStackHeader edges={['left', 'right']}>
        <View style={styles.container}>
          <ScreenTopAdBanner />
          <AzoresbusTrackingUnavailable variant="offline" />
        </View>
      </Screen>
    );
  }

  if (healthQuery.isLoading && healthQuery.data == null) {
    return (
      <Screen withStackHeader edges={['left', 'right']}>
        <LoadingState />
      </Screen>
    );
  }

  if (!trackingAvailable) {
    return (
      <Screen withStackHeader edges={['left', 'right']}>
        <View style={styles.container}>
          <ScreenTopAdBanner />
          <AzoresbusTrackingUnavailable
            onTryAgain={onTryAgain}
            tryAgainDisabled={cooldownSeconds > 0 || healthQuery.isFetching}
            tryAgainLabel={
              cooldownSeconds > 0
                ? t('azoresbusLiveTryAgainWait', { seconds: cooldownSeconds })
                : t('azoresbusLiveTryAgain')
            }
            loading={healthQuery.isFetching}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen withStackHeader edges={['left', 'right']}>
      <View style={styles.container}>
        <ScreenTopAdBanner />
        {selectedVehicleId == null ? (
          <>
            <View style={styles.controls}>
              <View style={styles.controlsGrow}>
                <AzoresbusLineSelect
                  lines={fleetLines}
                  selectedLineCodes={selectedLineCodes}
                  onChange={(codes) => {
                    setSelectedLineCodes(codes);
                    trackLiveFilter(codes.length ? 'sheet' : 'clear', codes.join(',') || null);
                  }}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('azoresbusLiveStopSearchTitle')}
                onPress={() => {
                  trackLiveStopSearch('open');
                  setStopSearchOpen(true);
                }}
                style={({ pressed }) => [
                  styles.stopSearch,
                  {
                    backgroundColor: theme.surfaceVariant,
                    borderColor: theme.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Search size={16} color={theme.muted} strokeWidth={2} />
                <Text style={[typography.label, { color: theme.text }]} numberOfLines={1}>
                  {t('azoresbusLiveStopSearchTitle')}
                </Text>
              </Pressable>
            </View>
            <AzoresbusTrackingFreshness
              updatedAt={fleetQuery.dataUpdatedAt}
              isRefetching={fleetQuery.isRefetching}
            />
          </>
        ) : null}

        <View style={styles.mapWrap}>
          <AzoresbusLiveMap
            ref={mapRef}
            vehicles={visibleVehicles}
            routePolyline={routePolyline}
            routeColor={detailQuery.data?.route?.color ?? null}
            unknownLineLabel="?"
            onVehiclePress={(vehicleId) => onSelectVehicle(vehicleId, 'map')}
          />
          {fleetQuery.isLoading ? (
            <View style={styles.mapLoading} pointerEvents="none">
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : null}
        </View>

        {selectedVehicleId != null ? (
          <AzoresbusVehicleSheet
            vehicle={detailQuery.data}
            updatedAt={detailQuery.dataUpdatedAt}
            isRefetching={detailQuery.isRefetching}
            onClose={() => setSelectedVehicleId(null)}
            onStopPress={(stopId) => {
              trackLiveSelectStop('vehicle_sheet', { stop: String(stopId) });
              router.push(`/(tabs)/transit/stop/${stopId}`);
            }}
          />
        ) : null}

        <AzoresbusStopSearchSheet
          visible={stopSearchOpen}
          stops={stops}
          onClose={() => setStopSearchOpen(false)}
          onOpenStop={(stopId) => {
            setStopSearchOpen(false);
            router.push(`/(tabs)/transit/stop/${stopId}`);
          }}
          onSelectVehicle={(vehicleId) => {
            // Already on the live map: focus in place rather than re-navigating.
            setStopSearchOpen(false);
            setSelectedVehicleId(vehicleId);
            trackLiveSelectVehicle('stop_arrivals', { vehicle: vehicleId });
            const vehicle = vehicles.find((item) => item.id === vehicleId);
            if (vehicle) {
              mapRef.current?.centerOnVehicle(vehicle);
            }
          }}
        />

        <AzoresbusLiveFleetBar
          vehicles={visibleVehicles}
          filteredLineCodes={selectedLineCodes}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={(vehicleId) => onSelectVehicle(vehicleId, 'fleet_bar')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingRight: space.md,
    // Clear of the stack header — without it the pills sit flush against it.
    paddingTop: space.md,
  },
  controlsGrow: { flexShrink: 1 },
  stopSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: space.sm,
  },
  mapWrap: { flex: 1 },
  mapLoading: {
    position: 'absolute',
    top: space.md,
    alignSelf: 'center',
  },
});
