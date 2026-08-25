import type { MinibusJourney } from '@/lib/types';

export function minibusJourneyLineCodes(journey: MinibusJourney): string {
  return journey.legs.map((leg) => leg.line_code).join(',');
}

export function minibusJourneyEndpoints(journey: MinibusJourney): {
  origin: string;
  destination: string;
} {
  const firstLeg = journey.legs[0];
  const lastLeg = journey.legs[journey.legs.length - 1];
  return {
    origin: firstLeg?.board.name ?? '',
    destination: lastLeg?.alight.name ?? '',
  };
}

export function minibusJourneyAnalyticsProps(
  journey: MinibusJourney,
  extras: Record<string, string | number | boolean> = {},
): Record<string, string | number | boolean> {
  const { origin, destination } = minibusJourneyEndpoints(journey);
  return {
    origin,
    destination,
    transfers: journey.transfers,
    total_stops: journey.total_stops,
    line_codes: minibusJourneyLineCodes(journey),
    ...extras,
  };
}
