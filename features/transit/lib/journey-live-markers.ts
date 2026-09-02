import { journeyRideLegs, type TransitJourney, type TransitTripLive } from '@/lib/types';

/**
 * A fixed accent rather than the leg's own route color, so the real bus never
 * reads as just another same-colored pin on its own route line. The line-code
 * label still carries identity, which is what a two-leg journey with two live
 * buses at once would otherwise lose by sharing one color.
 */
export const LIVE_VEHICLE_COLOR = '#22c55e';

export interface JourneyLiveVehicle {
  id: string;
  position: { lat: number; lon: number };
  /** The line code, which is what identifies a bus at a glance on this network. */
  label: string;
  color: string;
}

/** One marker per ride leg that has a live bus. */
export function journeyLiveVehicles(
  journey: TransitJourney,
  trips: TransitTripLive[],
): JourneyLiveVehicle[] {
  return journeyRideLegs(journey).flatMap((leg) => {
    const row = trips.find((t) => t.tripId === leg.tripId && t.state === 'live' && t.vehicle);
    if (!row?.vehicle) {
      return [];
    }
    return [
      {
        id: row.vehicle.id,
        position: row.vehicle.position,
        label: leg.route,
        color: LIVE_VEHICLE_COLOR,
      },
    ];
  });
}

/** The trip ids for every ride leg — what `useTrackLive` needs on the map screen. */
export function journeyRideTripIds(journey: TransitJourney | null): number[] {
  return journey ? journeyRideLegs(journey).map((leg) => leg.tripId) : [];
}
