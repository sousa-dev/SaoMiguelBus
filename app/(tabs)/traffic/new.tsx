import { useEffect, useMemo, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { TrafficReportForm } from '@/features/traffic/components/TrafficReportForm';
import {
  useCreateTrafficReport,
  useTrafficCategories,
} from '@/features/traffic/hooks/useTrafficQueries';
import { useNearbyLocation } from '@/features/traffic/hooks/useNearbyLocation';
import { clampCoordinate, isWithinIslandBounds } from '@/lib/island-map';
import { useNetworkStatus } from '@/lib/network-status';
import { useAppStackScreenOptions } from '@/lib/navigation';
import type { TrafficReportWriteInput } from '@/lib/types';
import { useTrafficStore } from '@/lib/traffic-store';

function parseCoord(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export default function NewTrafficReportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const screenOptions = useAppStackScreenOptions();
  const { isOnline } = useNetworkStatus();
  const params = useLocalSearchParams<{ category?: string; lat?: string; lng?: string }>();

  const categories = useTrafficCategories();
  const create = useCreateTrafficReport();
  const addReport = useTrafficStore((s) => s.addReport);
  const { coords: gpsCoords } = useNearbyLocation(true);
  const userOnIsland = gpsCoords ? isWithinIslandBounds(gpsCoords.lat, gpsCoords.lng) : false;

  const paramCoords = useMemo(() => {
    const lat = parseCoord(params.lat);
    const lng = parseCoord(params.lng);
    if (lat == null || lng == null) {
      return null;
    }
    return clampCoordinate(lat, lng);
  }, [params.lat, params.lng]);

  const [reportCoords, setReportCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coordsInitialized, setCoordsInitialized] = useState(false);

  useEffect(() => {
    if (paramCoords) {
      setReportCoords(paramCoords);
      setCoordsInitialized(true);
      return;
    }
    if (!coordsInitialized && userOnIsland && gpsCoords) {
      setReportCoords(gpsCoords);
      setCoordsInitialized(true);
    }
  }, [paramCoords, coordsInitialized, userOnIsland, gpsCoords]);

  const onSubmit = async (input: TrafficReportWriteInput) => {
    if (!isOnline) {
      setError(t('offlineBanner'));
      return;
    }
    setError(null);
    try {
      const report = await create.mutateAsync(input);
      addReport(report.id);
      router.back();
    } catch {
      setError(t('trafficReportError'));
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          ...screenOptions,
          headerShown: true,
          title: t('trafficReportTitle'),
          headerBackVisible: false,
        }}
      />
      <Screen>
        <TrafficReportForm
          categories={categories.data ?? []}
          initialCategory={params.category}
          coords={reportCoords}
          gpsCoords={userOnIsland ? gpsCoords : null}
          userOnIsland={userOnIsland}
          onCoordsChange={setReportCoords}
          submitting={create.isPending}
          error={error}
          offline={!isOnline}
          onSubmit={(input) => void onSubmit(input)}
        />
      </Screen>
    </>
  );
}
