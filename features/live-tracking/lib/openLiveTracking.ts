import { InteractionManager } from 'react-native';
import type { useRouter } from 'expo-router';

import { type LiveHref, liveMapHref } from '@/features/live-tracking/lib/liveMapHref';

export { liveMapHref };

/** expo-router does not export a `Router` type; derive it from the hook. */
type Router = ReturnType<typeof useRouter>;

/**
 * Push a live map once native/modal transitions have settled.
 *
 * The double deferral is load-bearing and must not be simplified away: the entry
 * points await an interstitial first, and pushing while that ad is still
 * dismissing drops the navigation on the floor -- the user pays for an ad and
 * lands back where they started. `runAfterInteractions` waits for the dismissal
 * animation, and the extra frame lets the navigator settle before the push.
 */
export function openLiveMap(router: Router, href: LiveHref) {
  InteractionManager.runAfterInteractions(() => {
    requestAnimationFrame(() => {
      router.push(href);
    });
  });
}
