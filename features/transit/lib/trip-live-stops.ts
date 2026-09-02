/**
 * Overlaying live per-stop ETAs onto a trip's scheduled stop list.
 *
 * Deliberately not a component prop on `RouteCard`/`TripDetail` — those are
 * shared by search results and journey cards that never have live context, so
 * this builds a plain, already-annotated `TripStop[]` once in the trip detail
 * screen and hands it in as ordinary data. A stop with no live match, or with
 * no `sequence` to match by, is returned exactly as it came in.
 */
import type { TransitTripLiveNextStop, TripStop } from '@/lib/types';

export function annotateStopTimes(
  stops: TripStop[],
  upcomingStops: TransitTripLiveNextStop[],
  formatEta: (minutes: number) => string,
): TripStop[] {
  const dueBySequence = new Map<number, number>();
  for (const stop of upcomingStops) {
    if (stop.sequence != null) {
      dueBySequence.set(stop.sequence, stop.dueInMinutes);
    }
  }
  if (dueBySequence.size === 0) {
    return stops;
  }
  return stops.map((stop) => {
    if (stop.sequence == null || !dueBySequence.has(stop.sequence)) {
      return stop;
    }
    return { ...stop, time: `${stop.time} · ${formatEta(dueBySequence.get(stop.sequence)!)}` };
  });
}
