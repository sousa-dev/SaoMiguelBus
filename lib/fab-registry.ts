import type { Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { Map, Mountain, Newspaper } from 'lucide-react-native';

/**
 * One action shown in the global FAB speed-dial. Either navigate (`href`) or run
 * a screen-supplied handler (`onPress`). The "Send feedback" action is NOT part
 * of this registry — it is appended last by `GlobalFab` so it can never be
 * accidentally dropped from a screen.
 */
export type FabAction = {
  key: string;
  /** i18n key resolved with `t()` at render time. */
  labelKey: string;
  icon: LucideIcon;
  href?: Href;
  onPress?: () => void;
};

function firstSegment(pathname: string): string {
  return pathname.replace(/^\/+/, '').split('/')[0] ?? '';
}

/** Routes where the global FAB must not appear (form/modal screens). */
const HIDDEN_SEGMENTS = new Set(['feedback', 'settings', 'onboarding']);
const HIDDEN_PATHS = new Set([
  '/(tabs)/marketplace/new',
  '/marketplace/new',
  '/(tabs)/traffic/new',
  '/traffic/new',
]);

export function isFabHidden(pathname: string): boolean {
  if (HIDDEN_PATHS.has(pathname)) {
    return true;
  }
  if (pathname.startsWith('/marketplace/edit') || pathname.includes('/marketplace/edit')) {
    return true;
  }
  return HIDDEN_SEGMENTS.has(firstSegment(pathname));
}

/** i18n key for the human-readable label of a route's first segment. */
const SEGMENT_LABEL_KEY: Record<string, string> = {
  '': 'hubTitle',
  hub: 'hubTitle',
  transit: 'navBarSearchLabel',
  news: 'navBarNewsLabel',
  earthquakes: 'navBarEarthquakesLabel',
  trails: 'navBarTrailsLabel',
  marketplace: 'navBarMarketplaceLabel',
  traffic: 'navBarTrafficLabel',
  tours: 'navBarToursLabel',
  settings: 'settingsTitle',
};

export function getScreenLabelKey(pathname: string): string | null {
  return SEGMENT_LABEL_KEY[firstSegment(pathname)] ?? null;
}

/**
 * Static, stateless contextual actions for a given route. Stateful per-screen
 * actions are injected separately via `useFabActions` (see `lib/fab-store.ts`).
 */
export function getStaticActions(pathname: string): FabAction[] {
  const seg = firstSegment(pathname);

  // Transit list root only (not directions / trip detail).
  if (pathname === '/transit' || pathname === '/(tabs)/transit') {
    return [
      {
        key: 'plan-trip',
        labelKey: 'fabPlanTrip',
        icon: Map,
        href: '/(tabs)/transit/directions' as Href,
      },
    ];
  }

  if (seg === 'news') {
    return [
      {
        key: 'suggest-source',
        labelKey: 'fabSuggestSource',
        icon: Newspaper,
        href: { pathname: '/feedback', params: { category: 'feature', preset: 'newsSource' } } as Href,
      },
    ];
  }

  if (seg === 'trails') {
    return [
      {
        key: 'suggest-trail',
        labelKey: 'fabSuggestTrail',
        icon: Mountain,
        href: { pathname: '/feedback', params: { category: 'feature', preset: 'trail' } } as Href,
      },
    ];
  }

  return [];
}
