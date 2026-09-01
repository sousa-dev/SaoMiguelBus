import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

import { isModuleRoot, moduleRootHref } from '@/lib/app-back';

/**
 * Android's hardware back, given the same semantics as the header arrow.
 *
 * expo-router's own `useBackButton` already pops when there is history; this adds the
 * missing half — a screen reached by deep link, notification tap or `replace` has an
 * empty stack, and without a fallback the OS reads "nothing handled it" and closes the
 * app instead of returning to the module the rider was in.
 *
 * Registered after `useBackButton` (this mounts below the navigator), so it runs first;
 * returning `false` still falls through to it and then to the OS.
 */
export function AndroidBackHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) {
        router.back();
        return true;
      }

      const fallback = moduleRootHref(pathname);
      if (fallback && !isModuleRoot(pathname)) {
        router.replace(fallback);
        return true;
      }

      // At the module root the rider landed on — leaving the app is the right answer.
      return false;
    });

    return () => subscription.remove();
  }, [router, pathname]);

  return null;
}
