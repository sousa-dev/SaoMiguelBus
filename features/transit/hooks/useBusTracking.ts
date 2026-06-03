import { useEffect, useMemo, useState } from 'react';

import { computeBusStatus, buildActiveTrackFromTrip } from '@/lib/bus-tracking';
import { useProfileStore, type ActiveTrack } from '@/lib/profile-store';
import type { TransitSearchResult } from '@/lib/types';

export function useBusTracking() {
  const tracking = useProfileStore((s) => s.tracking);
  const startTracking = useProfileStore((s) => s.startTracking);
  const stopTracking = useProfileStore((s) => s.stopTracking);
  const pinRoute = useProfileStore((s) => s.pinRoute);
  const unpinRoute = useProfileStore((s) => s.unpinRoute);
  const pruneTracking = useProfileStore((s) => s.pruneTracking);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    pruneTracking();
    const id = setInterval(() => {
      pruneTracking();
      setTick((n) => n + 1);
    }, 30_000);
    return () => clearInterval(id);
  }, [pruneTracking]);

  const activeViews = useMemo(
    () =>
      tracking.active.map((track) => ({
        track,
        status: computeBusStatus(track),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick drives refresh
    [tracking.active, tick],
  );

  const canStartMore = tracking.active.length < 5;

  const startFromTrip = (trip: TransitSearchResult, searchDay: string) => {
    const payload = buildActiveTrackFromTrip(trip, searchDay);
    return startTracking(payload);
  };

  const pinFromTrip = (trip: TransitSearchResult, searchDay: string) => {
    const payload = buildActiveTrackFromTrip(trip, searchDay);
    return pinRoute({
      tripId: payload.tripId,
      routeNumber: payload.routeNumber,
      origin: payload.origin,
      destination: payload.destination,
      searchDay: payload.searchDay,
      stops: payload.stops,
    });
  };

  const isTrackingTrip = (tripId: number, origin: string, destination: string) =>
    tracking.active.some(
      (t) => t.tripId === tripId && t.origin === origin && t.destination === destination,
    );

  return {
    active: activeViews,
    pinned: tracking.pinned,
    canStartMore,
    startFromTrip,
    stopTracking,
    pinFromTrip,
    unpinRoute,
    isTrackingTrip,
  };
}

export type { ActiveTrack };
