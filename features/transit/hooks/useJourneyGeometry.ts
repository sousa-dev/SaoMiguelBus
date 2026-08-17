import { useQueries } from '@tanstack/react-query';

import { fetchTripGeometry } from '@/lib/api';
import { useTransitDataset } from '@/features/transit/hooks/useScheduleConfig';
import { journeyRideLegs, type TransitJourney, type TransitLegGeometry } from '@/lib/types';

/**
 * The drawable geometry for each ride leg of a journey.
 *
 * One query per leg rather than one per journey: legs are trips, trips are
 * shared between journeys, and caching per trip means opening the 08h10 and the
 * 12h34 Capelas → Ponta Delgada maps fetches the second leg once. The key
 * carries the sequence range because the same trip trimmed to a different ride
 * is a different path.
 *
 * Fetched only when a map is actually open (`enabled`), which is the whole
 * reason this is not inlined into the search response.
 */
export function useJourneyGeometry(journey: TransitJourney | null, enabled = true) {
  const dataset = useTransitDataset();
  const rides = journey ? journeyRideLegs(journey) : [];

  const results = useQueries({
    queries: rides.map((leg) => ({
      queryKey: [
        'transit',
        'trip-geometry',
        leg.tripId,
        leg.board.sequence,
        leg.alight.sequence,
        dataset ?? 'server',
      ],
      queryFn: () =>
        fetchTripGeometry({
          tripId: leg.tripId,
          from: leg.board.sequence,
          to: leg.alight.sequence,
          dataset,
        }),
      enabled: enabled && journey != null,
      // Timetable geometry does not move; a trip's shape is the same all day.
      staleTime: 60 * 60 * 1000,
    })),
  });

  return {
    geometries: results.map(
      (result) => result.data as TransitLegGeometry | undefined,
    ),
    isLoading: results.some((result) => result.isLoading),
    isError: results.some((result) => result.isError),
  };
}
