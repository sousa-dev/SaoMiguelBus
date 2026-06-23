import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
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
import { MinibusVehicleSheet } from '@/features/minibus/components/MinibusVehicleSheet';
import {
  isMinibusTrackingAvailable,
  useMinibusTrackingHealth,
} from '@/features/minibus/hooks/useMinibusTrackingHealth';
import { useMinibusLines } from '@/features/minibus/hooks/useMinibusQueries';
import { useMinibusScreenActive } from '@/features/minibus/hooks/useMinibusScreenActive';
import {
  useMinibusVehicleDetail,
  useMinibusVehicles,
} from '@/features/minibus/hooks/useMinibusTrackingQueries';
import {
  filterVehiclesByLineSlug,
  vehicleLineColorHex,
} from '@/features/minibus/lib/vehicleColor';
import { track } from '@/lib/analytics';
import { decodePolyline } from '@/lib/polyline';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const TRY_AGAIN_COOLDOWN_MS = 5000;

export default function MinibusLiveScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ line?: string }>();
  const initialLineSlug = typeof params.line === 'string' ? params.line : null;

  const screenActive = useMinibusScreenActive();
  const [selectedLineSlug, setSelectedLineSlug] = useState<string | null>(initialLineSlug);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const mapRef = useRef<MinibusLiveMapHandle>(null);

  const healthQuery = useMinibusTrackingHealth({ enabled: screenActive });
  const trackingAvailable = isMinibusTrackingAvailable(healthQuery.data);

  const linesQuery = useMinibusLines(trackingAvailable);
  const lines = linesQuery.data?.lines ?? [];

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
    if (!shape) {
      return undefined;
    }
    return decodePolyline(shape);
  }, [selectedVehicle?.journey?.shape]);

  const routeColor = useMemo(() => {
    if (!selectedVehicle) {
      return null;
    }
    return vehicleLineColorHex(selectedVehicle, lines);
  }, [lines, selectedVehicle]);

  const onVehiclePress = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    track('minibus', 'live_select', { vehicle_id: vehicleId });
    const vehicle = fleetQuery.data?.vehicles.find((row) => row.id === vehicleId);
    if (vehicle) {
      requestAnimationFrame(() => {
        mapRef.current?.centerOnVehicle(vehicle);
      });
    }
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
            vehicles={vehicles}
            lines={lines}
            routePolyline={routePolyline}
            routeColor={routeColor}
            onVehiclePress={onVehiclePress}
          />
          {fleetQuery.isFetching && !fleetQuery.data ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : null}
          {vehicles.length === 0 && fleetQuery.data && !fleetQuery.isFetching ? (
            <View style={[styles.emptyBanner, { backgroundColor: theme.surface }]}>
              <Text style={[typography.body, { color: theme.muted }]}>{t('minibusLiveEmpty')}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <MinibusVehicleSheet
        visible={selectedVehicleId != null}
        vehicle={selectedVehicle}
        lines={lines}
        trackingMeta={detailQuery.data ?? fleetQuery.data}
        onClose={() => setSelectedVehicleId(null)}
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
