import type { TFunction } from 'i18next';
import { Alert, Platform, Share } from 'react-native';

import { journeyRouteLabel } from '@/features/transit/lib/journey-legs';
import { track } from '@/lib/analytics';
import { transitSearchWebUrl, tripWebUrl } from '@/lib/app-links';
import { displayRouteNumber } from '@/lib/transit-format';
import {
  isRideLeg,
  isTransferLeg,
  journeyRideLegs,
  type TransitJourney,
  type TransitSearchResult,
} from '@/lib/types';

/**
 * `t` is passed in rather than read from the i18n singleton so the message
 * follows the language picked in Settings, and so these functions stay
 * testable without a mounted provider.
 */
type ShareOptions = {
  t: TFunction;
  alertTitle?: string;
};

/** The message body plus the "check the app" footer, one blank line between. */
function withFooter(t: TFunction, body: string, url: string): string {
  return `${body}\n\n${t('transitShareFooter', { url })}`;
}

async function openShareSheet(
  title: string,
  message: string,
  alertTitle?: string,
): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title, text: message });
      return;
    }
    await Share.share({ message, title });
  } catch {
    if (Platform.OS === 'web' && alertTitle) {
      Alert.alert(alertTitle, message);
    }
  }
}

/** Share one bus — a search result, or one ride leg of a journey. */
export async function shareTrip(
  trip: TransitSearchResult,
  { t, alertTitle }: ShareOptions,
): Promise<void> {
  const route = displayRouteNumber(trip.route);
  const message = withFooter(
    t,
    t('transitShareTripMessage', {
      route,
      origin: trip.origin,
      destination: trip.destination,
      start: trip.start,
      end: trip.end,
    }),
    tripWebUrl(trip.id),
  );

  // Raw `trip.route` on purpose: analytics keeps the `C` prefix it always had.
  track('transit', 'share', { trip_id: trip.id, route: trip.route });
  await openShareSheet(route, message, alertTitle);
}

/**
 * Share a whole itinerary: every bus, and the change between them.
 *
 * The change is the part two separate leg-shares lose, so it gets its own line
 * naming the stop, the next route and when it leaves.
 */
export async function shareJourney(
  journey: TransitJourney,
  { t, alertTitle }: ShareOptions,
): Promise<void> {
  const rides = journeyRideLegs(journey);
  const lines: string[] = [];

  journey.legs.forEach((leg, index) => {
    if (isRideLeg(leg)) {
      lines.push(
        t('transitShareJourneyMessage', {
          route: displayRouteNumber(leg.route),
          origin: leg.board.name,
          destination: leg.alight.name,
          start: leg.board.time,
          end: leg.alight.time,
        }),
      );
      return;
    }
    if (!isTransferLeg(leg)) {
      return;
    }
    // The departure the rider has to make is the next bus's boarding time, so
    // read it off the ride that follows rather than re-deriving it from waits.
    const nextRide = journey.legs.slice(index + 1).find(isRideLeg);
    if (!nextRide) {
      return;
    }
    let line = t('transitShareJourneyTransfer', {
      stop: leg.at,
      route: displayRouteNumber(leg.toRoute),
      time: nextRide.board.time,
    });
    if (leg.walkMinutes > 0) {
      line += ` · ${t('transitWalkFromTo', { count: leg.walkMinutes, from: leg.from })}`;
    }
    lines.push(line);
  });

  const first = rides[0];
  const last = rides[rides.length - 1];
  const routes = journeyRouteLabel(journey, displayRouteNumber);
  const message = withFooter(
    t,
    lines.join('\n'),
    transitSearchWebUrl(first?.board.name ?? '', last?.alight.name ?? ''),
  );

  track('transit', 'share', {
    journey_id: journey.id,
    routes,
    transfers: journey.transfers,
  });
  await openShareSheet(routes, message, alertTitle);
}
