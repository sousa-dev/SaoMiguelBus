/** Moved to `features/live-tracking/lib/openLiveTracking`; builds the minibus href. */
import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

import { liveMapHref, openLiveMap } from '@/features/live-tracking/lib/openLiveTracking';

/** Push live map after native/modal transitions settle (post-interstitial safe). */
export function openMinibusLiveMap(router: Router, lineSlug?: string | null) {
  openLiveMap(router, liveMapHref('/minibus/live', lineSlug));
}
