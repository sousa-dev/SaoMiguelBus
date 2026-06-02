import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { logger } from '@/lib/logger';

export type LocationPermission = 'granted' | 'denied' | 'undetermined';

export interface NearbyLocation {
  coords: { lat: number; lng: number } | null;
  permission: LocationPermission;
}

/**
 * Foreground-only location watcher. Native uses expo-location; web uses the
 * browser geolocation API. Watching is gated by `enabled` so the caller can
 * stop it when the traffic screen loses focus (battery/privacy).
 */
export function useNearbyLocation(enabled: boolean): NearbyLocation {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [permission, setPermission] = useState<LocationPermission>('undetermined');
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

    async function startNative() {
      try {
        const Location = await import('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) {
          return;
        }
        if (status !== 'granted') {
          setPermission('denied');
          return;
        }
        setPermission('granted');
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 50, timeInterval: 10000 },
          (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        );
        if (cancelled) {
          sub.remove();
          return;
        }
        cleanupRef.current = () => sub.remove();
      } catch (error) {
        logger.warn('traffic location watch failed', error);
        setPermission('denied');
      }
    }

    function startWeb() {
      const geo = (typeof navigator !== 'undefined' ? (navigator as any).geolocation : undefined);
      if (!geo?.watchPosition) {
        setPermission('denied');
        return;
      }
      const id = geo.watchPosition(
        (pos: { coords: { latitude: number; longitude: number } }) => {
          setPermission('granted');
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => setPermission('denied'),
        { enableHighAccuracy: false, maximumAge: 10000 },
      );
      cleanupRef.current = () => geo.clearWatch(id);
    }

    if (Platform.OS === 'web') {
      startWeb();
    } else {
      void startNative();
    }

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [enabled]);

  return { coords, permission };
}
