import type { useRouter } from 'expo-router';

import { openLiveMap } from '@/features/live-tracking/lib/openLiveTracking';

import { AZORESBUS_LIVE_PATH, azoresbusLiveHref } from './liveHref';

type Router = ReturnType<typeof useRouter>;

export { AZORESBUS_LIVE_PATH, azoresbusLiveHref };

export function openAzoresbusLiveMap(router: Router, lineCode?: string | null) {
  openLiveMap(router, azoresbusLiveHref(lineCode));
}
