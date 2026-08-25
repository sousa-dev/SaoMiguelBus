import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { DEFAULT_PARISH_SLUG } from '@/features/weather/weather-constants';
import { useWeatherParishes } from '@/features/weather/hooks/useWeatherQueries';
import { useWeatherStore } from '@/features/weather/weather-store';
import { logger } from '@/lib/logger';
import type { ParishWeather } from '@/lib/types';

export type ResolvedParishSource = 'pinned' | 'location' | 'default';

export interface ResolvedParish {
  slug: string;
  source: ResolvedParishSource;
  /** True while we are still waiting on a location fix before settling on a parish. */
  isLocating: boolean;
}

/** Cheap planar distance proxy — good enough for nearest-parish on a single island. */
function distanceSq(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = aLat - bLat;
  const dLng = (aLng - bLng) * Math.cos((((aLat + bLat) / 2) * Math.PI) / 180);
  return dLat * dLat + dLng * dLng;
}

function nearestSlug(lat: number, lng: number, parishes: ParishWeather[]): string | null {
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const p of parishes) {
    if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') {
      continue;
    }
    const d = distanceSq(lat, lng, p.latitude, p.longitude);
    if (d < bestDistance) {
      bestDistance = d;
      best = p.slug;
    }
  }
  return best;
}

/**
 * Resolves which parish the home weather card should show:
 *   1. first valid pinned parish, else
 *   2. nearest parish to a one-shot device location, else
 *   3. the Ponta Delgada default.
 * Never blocks: returns the default (with `isLocating: true`) while location resolves.
 */
export function useResolvedParish(enabled = true): ResolvedParish {
  const pinnedSlugs = useWeatherStore((s) => s.pinnedSlugs);
  const { data } = useWeatherParishes(enabled);
  const parishes = data?.parishes;

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [located, setLocated] = useState(false);
  const requestedRef = useRef(false);

  const pinnedSlug = useMemo(() => {
    if (!pinnedSlugs.length) {
      return null;
    }
    if (!parishes) {
      return pinnedSlugs[0];
    }
    const valid = new Set(parishes.map((p) => p.slug));
    return pinnedSlugs.find((s) => valid.has(s)) ?? null;
  }, [pinnedSlugs, parishes]);

  const needLocation = enabled && !pinnedSlug;

  useEffect(() => {
    if (!needLocation || requestedRef.current) {
      return;
    }
    requestedRef.current = true;
    let cancelled = false;

    async function resolveLocation() {
      try {
        if (Platform.OS === 'web') {
          const geo = typeof navigator !== 'undefined' ? (navigator as any).geolocation : undefined;
          if (!geo?.getCurrentPosition) {
            if (!cancelled) setLocated(true);
            return;
          }
          geo.getCurrentPosition(
            (pos: { coords: { latitude: number; longitude: number } }) => {
              if (!cancelled) {
                setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setLocated(true);
              }
            },
            () => {
              if (!cancelled) setLocated(true);
            },
            { enableHighAccuracy: false, maximumAge: 600000, timeout: 8000 },
          );
          return;
        }

        const Location = await import('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setLocated(true);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        if (cancelled) return;
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocated(true);
      } catch (error) {
        logger.warn('weather location resolve failed', error);
        if (!cancelled) setLocated(true);
      }
    }

    void resolveLocation();
    return () => {
      cancelled = true;
    };
  }, [needLocation]);

  return useMemo<ResolvedParish>(() => {
    if (pinnedSlug) {
      return { slug: pinnedSlug, source: 'pinned', isLocating: false };
    }
    if (coords && parishes?.length) {
      const near = nearestSlug(coords.lat, coords.lng, parishes);
      if (near) {
        return { slug: near, source: 'location', isLocating: false };
      }
    }
    return {
      slug: DEFAULT_PARISH_SLUG,
      source: 'default',
      isLocating: needLocation && !located,
    };
  }, [pinnedSlug, coords, parishes, needLocation, located]);
}
