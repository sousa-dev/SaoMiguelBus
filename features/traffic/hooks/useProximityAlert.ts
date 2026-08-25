import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Vibration } from 'react-native';

import type { TrafficReport } from '@/lib/types';

const EARTH_RADIUS_M = 6371000;

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Returns the closest active report within `thresholdM` of the user and
 * fires a short vibration the first time each report enters the threshold.
 */
export function useProximityAlert(
  reports: TrafficReport[],
  userCoords: { lat: number; lng: number } | null,
  thresholdM = 800,
): TrafficReport | null {
  const [nearest, setNearest] = useState<TrafficReport | null>(null);
  const alertedIds = useRef<Set<number>>(new Set());

  const candidate = useMemo(() => {
    if (!userCoords) {
      return null;
    }
    let best: { report: TrafficReport; dist: number } | null = null;
    for (const report of reports) {
      if (report.status !== 'active') {
        continue;
      }
      const dist = distanceMeters(userCoords, { lat: report.latitude, lng: report.longitude });
      if (dist <= thresholdM && (!best || dist < best.dist)) {
        best = { report, dist };
      }
    }
    return best?.report ?? null;
  }, [reports, userCoords, thresholdM]);

  useEffect(() => {
    setNearest(candidate);
    if (candidate && !alertedIds.current.has(candidate.id)) {
      alertedIds.current.add(candidate.id);
      if (Platform.OS !== 'web') {
        Vibration.vibrate(300);
      }
    }
  }, [candidate]);

  return nearest;
}
