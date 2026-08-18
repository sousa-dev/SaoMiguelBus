import { useEffect, useMemo, useState } from 'react';

import { journeyAsActiveTrack, journeyAsPinnedRoute } from '@/features/transit/lib/journey-legs';
import { useResolvedTransitDataset } from '@/features/transit/hooks/useScheduleConfig';
import {
  MAX_ACTIVE_TRACKS,
  buildActiveTrackFromTrip,
  computeBusStatus,
  computeJourneyStatus,
  deriveTrackExpiry,
} from '@/lib/bus-tracking';
import { useProfileStore, type ActiveTrack } from '@/lib/profile-store';
import { displayRouteNumber } from '@/lib/transit-format';
import type { TransitJourney, TransitSearchResult } from '@/lib/types';

export function useBusTracking() {
  const tracking = useProfileStore((s) => s.tracking);
  const startTracking = useProfileStore((s) => s.startTracking);
  const stopTracking = useProfileStore((s) => s.stopTracking);
  const pinRoute = useProfileStore((s) => s.pinRoute);
  const unpinRoute = useProfileStore((s) => s.unpinRoute);
  const pruneTracking = useProfileStore((s) => s.pruneTracking);
  // Which network the countdowns were built against. A track from the other one
  // is wrong the instant the network changes (09 §3.5).
  const dataset = useResolvedTransitDataset();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    pruneTracking(Date.now(), dataset);
    const id = setInterval(() => {
      pruneTracking(Date.now(), dataset);
      setTick((n) => n + 1);
    }, 30_000);
    return () => clearInterval(id);
  }, [pruneTracking, dataset]);

  const activeViews = useMemo(
    () =>
      tracking.active.map((track) => ({
        track,
        status: computeBusStatus(track),
        journey: computeJourneyStatus(track),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick drives refresh
    [tracking.active, tick],
  );

  const canStartMore = tracking.active.length < MAX_ACTIVE_TRACKS;

  const startFromTrip = (trip: TransitSearchResult, searchDay: string) => {
    const payload = buildActiveTrackFromTrip(trip, searchDay);
    return startTracking({
      ...payload,
      ...(dataset ? { dataset } : {}),
      expiresAt: deriveTrackExpiry(payload.legs, payload.searchDate),
    });
  };

  const pinFromTrip = (trip: TransitSearchResult, searchDay: string) => {
    const payload = buildActiveTrackFromTrip(trip, searchDay);
    return pinRoute({
      tripId: payload.tripId,
      routeNumber: payload.routeNumber,
      origin: payload.origin,
      destination: payload.destination,
      searchDay: payload.searchDay,
      legs: payload.legs,
      transfers: payload.transfers,
      stops: payload.stops,
      ...(dataset ? { dataset } : {}),
    });
  };

  const startFromJourney = (journey: TransitJourney, searchDay: string) => {
    const payload = journeyAsActiveTrack(journey, searchDay, dataset, displayRouteNumber);
    return startTracking({
      ...payload,
      expiresAt: deriveTrackExpiry(payload.legs, payload.searchDate),
    });
  };

  const pinFromJourney = (journey: TransitJourney, searchDay: string) =>
    pinRoute(journeyAsPinnedRoute(journey, searchDay, dataset, displayRouteNumber));

  const isTrackingTrip = (tripId: number, origin: string, destination: string) =>
    tracking.active.some(
      (t) =>
        t.origin === origin &&
        t.destination === destination &&
        (t.legs?.[0]?.tripId === tripId || t.tripId === tripId),
    );

  const isTrackingJourney = (journeyId: string) =>
    tracking.active.some((t) => t.journeyId === journeyId);

  const isPinnedJourney = (journeyId: string) =>
    tracking.pinned.some((p) => p.journeyId === journeyId);

  const activeJourneyId = (journeyId: string) =>
    tracking.active.find((t) => t.journeyId === journeyId)?.id;

  return {
    active: activeViews,
    pinned: tracking.pinned,
    canStartMore,
    startFromTrip,
    stopTracking,
    pinFromTrip,
    startFromJourney,
    pinFromJourney,
    unpinRoute,
    isTrackingTrip,
    isTrackingJourney,
    isPinnedJourney,
    activeJourneyId,
  };
}

export type { ActiveTrack };
