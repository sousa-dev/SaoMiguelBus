import { useCallback, useEffect } from 'react';
import {
  useLocalSearchParams,
  useNavigation,
  usePathname,
  useRouter,
  type Href,
} from 'expo-router';

import { TAB_SCREEN_TO_MODULE_KEY } from '@/lib/hub-tab-screens';
import { HUB_TAB } from '@/lib/modules';

export const HUB_ROOT_HREF = '/(tabs)/hub' as Href;

/** First path segment, ignoring the `(tabs)` group expo-router usually strips anyway. */
function firstSegment(pathname: string): string | undefined {
  const segments = pathname.split('/').filter((s) => s.length > 0 && !s.startsWith('('));
  return segments[0];
}

/**
 * The module root a path belongs to — `/transit/stop/12` → `/(tabs)/transit`.
 * Undefined for anything outside the tabs (settings, profile, onboarding, admin).
 */
export function moduleRootHref(pathname: string): Href | undefined {
  const segment = firstSegment(pathname);
  if (!segment) {
    return undefined;
  }
  if (segment === HUB_TAB.key) {
    return HUB_ROOT_HREF;
  }
  if (!Object.prototype.hasOwnProperty.call(TAB_SCREEN_TO_MODULE_KEY, segment)) {
    return undefined;
  }
  return `/(tabs)/${segment}` as Href;
}

/** True when the path IS a module root, i.e. there is nothing left to fall back to. */
export function isModuleRoot(pathname: string): boolean {
  const segments = pathname.split('/').filter((s) => s.length > 0 && !s.startsWith('('));
  return segments.length === 1 && moduleRootHref(pathname) != null;
}

export function parseReturnHref(returnTo: string | string[] | undefined): Href | undefined {
  if (returnTo == null) {
    return undefined;
  }
  const value = typeof returnTo === 'string' ? returnTo : returnTo[0];
  return value ? (value as Href) : undefined;
}

/**
 * The one back semantic in the app. Every affordance — the header arrow, the Android
 * hardware back button, the iOS swipe — resolves through this so they cannot diverge.
 */
export function useAppBack() {
  const router = useRouter();
  const pathname = usePathname();

  const goBack = useCallback(
    (fallbackHref?: Href, returnHref?: Href) => {
      if (returnHref) {
        router.replace(returnHref);
        return;
      }
      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace(fallbackHref ?? moduleRootHref(pathname) ?? HUB_ROOT_HREF);
    },
    [router, pathname],
  );

  return { goBack };
}

/** The `returnTo` route param, when a screen was entered from another module. */
export function useReturnHref(paramName = 'returnTo'): Href | undefined {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  return parseReturnHref(params[paramName]);
}

/**
 * Re-targets the NATIVE pop (iOS swipe-back, both platforms' native arrow) at the
 * `returnTo` destination. Without this the gesture pops the stack while the header
 * arrow replaces to another module — the same screen, two different destinations.
 */
export function useAppBackGuard(fallbackHref?: Href, returnHref?: Href) {
  const navigation = useNavigation();
  const { goBack } = useAppBack();

  useEffect(() => {
    if (!returnHref) {
      return;
    }
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (e.data?.action?.type !== 'GO_BACK') {
        return;
      }
      e.preventDefault();
      goBack(fallbackHref, returnHref);
    });
    return unsubscribe;
  }, [navigation, goBack, fallbackHref, returnHref]);
}
