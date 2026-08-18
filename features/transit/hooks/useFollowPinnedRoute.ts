/**
 * "Seguir viagem" — turn a pinned itinerary into a live track (09 §3.4).
 *
 * The button used to call `onSelect(origin, destination)`, which is what "Ver
 * horários" does: it refilled the search form and nothing was ever tracked. The
 * reason it stopped there is real — a pin's `legs[].tripId` is dropped at cutover
 * and rolls overnight anyway — so following one means re-running the search and
 * finding the same itinerary in today's answers.
 *
 * This does that WITHOUT the `/journeys/resolve` endpoint 09 §4 sketches: a
 * whole-day search per service day, then `resolvePinnedFollow` picks the pinned
 * run out of it. Three network calls at worst, because service is keyed on three
 * day types, and all of them share the search screen's react-query cache.
 */

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useBootstrap } from '@/features/transit/hooks/useBootstrapQueries';
import { useBusTracking } from '@/features/transit/hooks/useBusTracking';
import {
  FULL_DAY_START,
  fetchJourneySearch,
  journeySearchQueryKey,
  type JourneySearchParams,
} from '@/features/transit/hooks/useOfflineSearch';
import { useTransitDataset } from '@/features/transit/hooks/useScheduleConfig';
import {
  nextServiceDays,
  resolvePinnedFollow,
  type FollowDay,
} from '@/features/transit/lib/pinned-follow';
import { logger } from '@/lib/logger';
import { useNetwork } from '@/lib/network-provider';
import { formatWeekdayDate } from '@/lib/format-time';
import type { PinnedRoute } from '@/lib/profile-store';
import type { DayType } from '@/lib/transit-format';
import type { TransitJourneySearch } from '@/lib/types';

/**
 * Pins can hold a change of bus, so the search has to allow one — a direct-only
 * search can never return a two-leg pin's itinerary.
 */
const FOLLOW_MAX_TRANSFERS = 1;

export function useFollowPinnedRoute() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { isOnline } = useNetwork();
  const dataset = useTransitDataset();
  const bootstrap = useBootstrap();
  const holidays = bootstrap.data?.holidays;
  const { canStartMore, startFromJourney, isTrackingJourney } = useBusTracking();
  const [followingId, setFollowingId] = useState<string | null>(null);

  const followPin = useCallback(
    async (pin: PinnedRoute) => {
      if (followingId) {
        return;
      }
      // Checked before the search as well as after: a rider at the cap should
      // not wait on three requests to be told no.
      if (!canStartMore) {
        Alert.alert(t('transitTrackCapTitle'), t('transitTrackCapMessage'));
        return;
      }

      setFollowingId(pin.id);
      try {
        const horizon = nextServiceDays(new Date(), holidays);

        // One search per day TYPE, not per date: `weekday` answers every weekday
        // in the window. The first date carrying each type is the one passed
        // along, because the offline bundle is date-keyed rather than type-keyed.
        const byDayType = new Map<DayType, Promise<TransitJourneySearch>>();
        const searchFor = (dayType: DayType, isoDate: string) => {
          const existing = byDayType.get(dayType);
          if (existing) {
            return existing;
          }
          const key: JourneySearchParams = {
            origin: pin.origin,
            destination: pin.destination,
            day: dayType,
            start: FULL_DAY_START,
            isoDate,
            maxTransfers: FOLLOW_MAX_TRANSFERS,
            dataset,
            isOnline,
          };
          const promise = queryClient.fetchQuery({
            queryKey: journeySearchQueryKey(key),
            queryFn: () => fetchJourneySearch({ ...key, source: 'follow_pin' }),
          });
          byDayType.set(dayType, promise);
          return promise;
        };

        const days: FollowDay[] = await Promise.all(
          horizon.map(async (day) => ({
            date: day.date,
            dayType: day.dayType,
            journeys: (await searchFor(day.dayType, day.date)).journeys,
          })),
        );

        const outcome = resolvePinnedFollow(pin, days, new Date());

        if (outcome.status === 'none') {
          Alert.alert(
            t('transitPinnedNoServiceTitle'),
            t('transitPinnedNoServiceMessage', {
              route: pin.routeNumber,
              time: pin.legs?.[0]?.start ?? '',
            }),
          );
          return;
        }

        if (outcome.status === 'later') {
          // Tomorrow is worth naming as tomorrow — "quinta-feira, 20 ago." for
          // the day after today reads as further away than it is.
          const isTomorrow = horizon[1]?.date === outcome.date;
          Alert.alert(
            t('transitPinnedNextDepartureTitle'),
            isTomorrow
              ? t('transitPinnedNextTomorrow', { time: outcome.time })
              : t('transitPinnedNextOnDay', {
                  day: formatWeekdayDate(outcome.date, i18n.language),
                  time: outcome.time,
                }),
          );
          return;
        }

        if (isTrackingJourney(outcome.journey.id)) {
          Alert.alert(t('transitActiveTracking'), t('alreadyTrackingJourney'));
          return;
        }
        // `startFromJourney` returns false for the cap and for a duplicate, and
        // the duplicate case is already handled above.
        if (!startFromJourney(outcome.journey, outcome.dayType)) {
          Alert.alert(t('transitTrackCapTitle'), t('transitTrackCapMessage'));
        }
      } catch (error) {
        logger.warn(`following pinned route failed: ${String(error)}`);
        Alert.alert(t('transitPinnedFollowFailedTitle'), t('transitPinnedFollowFailedMessage'));
      } finally {
        setFollowingId(null);
      }
    },
    [
      followingId,
      canStartMore,
      holidays,
      dataset,
      isOnline,
      queryClient,
      isTrackingJourney,
      startFromJourney,
      t,
      i18n.language,
    ],
  );

  return { followPin, followingId };
}
