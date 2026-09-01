import { useEffect, useRef } from 'react';

import { trackLiveArrivals } from '@/features/azoresbus/lib/live-analytics';
import type { LiveArrivalsSource } from '@/features/azoresbus/lib/live-analytics-props';

/**
 * Report an arrivals lookup once per stop, not once per poll.
 *
 * The query refreshes every ten seconds while the list is on screen, so firing
 * on every resolution would turn one rider checking one stop into dozens of
 * events and make the numbers meaningless. Keyed on the stop, so switching
 * stops reports again but sitting on one does not.
 */
export function useTrackArrivalsOnce(
  source: LiveArrivalsSource,
  stopId: number | null,
  arrivals: { stale: boolean }[] | undefined,
) {
  const reportedFor = useRef<number | null>(null);

  useEffect(() => {
    if (stopId == null) {
      reportedFor.current = null;
      return;
    }
    if (arrivals == null || reportedFor.current === stopId) {
      return;
    }
    reportedFor.current = stopId;
    trackLiveArrivals(source, arrivals);
  }, [arrivals, source, stopId]);
}
