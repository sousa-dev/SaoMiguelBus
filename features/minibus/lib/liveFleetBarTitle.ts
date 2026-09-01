/** Moved to `features/live-tracking/lib/liveFleetBarTitle`; binds minibus copy keys. */
import { liveFleetBarTitle as liveFleetBarTitleShared } from '@/features/live-tracking/lib/liveFleetBarTitle';

const MINIBUS_FLEET_BAR_KEYS = {
  title: 'minibusLiveFleetBarTitle',
  titleFiltered: 'minibusLiveFleetBarTitleFiltered',
};

export function liveFleetBarTitle(
  t: Parameters<typeof liveFleetBarTitleShared>[0],
  count: number,
  filteredLineCode: string | null,
): string {
  return liveFleetBarTitleShared(t, count, filteredLineCode, MINIBUS_FLEET_BAR_KEYS);
}
