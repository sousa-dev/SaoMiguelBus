/**
 * Realistic stand-in detail for the Test buttons.
 *
 * A preview that says "the town centre" is honest but flat; one that names the
 * rider's own route is immediately legible as *their* alert. So this borrows,
 * in order of how much it resembles what they would really receive:
 *
 *  1. the journey they are looking at, when the sheet was opened from a card
 *  2. anything they are currently tracking
 *  3. anything they have pinned
 *  4. a translated generic
 *
 * The generic matters more than it looks. This app is white-labelled by
 * `islandKey`, so a hardcoded São Miguel stop name would be simply wrong on a
 * second island — hence a translated phrase and a neutral route number rather
 * than a real place.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { PreviewSource } from '@/lib/notifications/preview';
import { useProfileStore, type ActiveTrack } from '@/lib/profile-store';

/** Not a real line on any island the app ships for. */
const FALLBACK_ROUTE = '1';

export function useNotificationPreviewSource(options: {
  /** The journey the sheet was opened for, when there is one. */
  track?: ActiveTrack;
  /** The lead time currently selected, so the copy shows their number. */
  leadMinutes?: number;
}): PreviewSource {
  const { t } = useTranslation();
  const firstTracked = useProfileStore((s) => s.tracking.active[0]);
  const firstPinned = useProfileStore((s) => s.tracking.pinned[0]);
  const { track, leadMinutes } = options;

  return useMemo(() => {
    const borrowed = track ?? firstTracked ?? firstPinned;
    const legs = borrowed?.legs ?? [];
    const firstLeg = legs[0];
    const lastLeg = legs[legs.length - 1];

    return {
      routeNumber: firstLeg?.routeNumber || borrowed?.routeNumber,
      boardStop: firstLeg?.stops?.[0]?.name || borrowed?.origin,
      alightStop:
        lastLeg?.stops?.[lastLeg.stops.length - 1]?.name || borrowed?.destination,
      leadMinutes,
      fallbackStop: t('notificationsTestSampleStop'),
      fallbackRoute: FALLBACK_ROUTE,
    };
  }, [track, firstTracked, firstPinned, leadMinutes, t]);
}
