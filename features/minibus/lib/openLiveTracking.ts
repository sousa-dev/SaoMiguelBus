import { InteractionManager } from 'react-native';
import type { Router } from 'expo-router';

/** Push live map after native/modal transitions settle (post-interstitial safe). */
export function openMinibusLiveMap(router: Router, lineSlug?: string | null) {
  const href =
    lineSlug != null && lineSlug.length > 0
      ? `/minibus/live?line=${encodeURIComponent(lineSlug)}`
      : '/minibus/live';

  InteractionManager.runAfterInteractions(() => {
    requestAnimationFrame(() => {
      router.push(href);
    });
  });
}
