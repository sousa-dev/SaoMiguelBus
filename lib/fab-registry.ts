import type { Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  Activity,
  Bus,
  CloudSun,
  ExternalLink,
  Footprints,
  LayoutGrid,
  Map,
  Mountain,
  Newspaper,
  Plus,
  Star,
  Store,
  Ticket,
  Binoculars,
} from 'lucide-react-native';

import { VIATOR_FALLBACK_URL, openViatorExternal } from '@/features/events/viator';
import { HUB_TAB } from '@/lib/modules';

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

const MODULE_ICON_BY_SEGMENT: Record<string, LucideIcon> = {
  hub: HUB_TAB.Icon,
  '': HUB_TAB.Icon,
  transit: Bus,
  news: Newspaper,
  earthquakes: Activity,
  trails: Footprints,
  marketplace: Store,
  traffic: Binoculars,
  tours: Ticket,
  weather: CloudSun,
};

function firstSegment(pathname: string): string {
  return normalizePath(pathname).split('/').filter(Boolean)[0] ?? '';
}

/** Strip Expo group prefixes and leading slashes for consistent matching. */
export function normalizePath(pathname: string): string {
  const stripped = pathname.replace(/^\/\(tabs\)/, '').replace(/^\/+/, '');
  return stripped || 'hub';
}

function routeParts(pathname: string): string[] {
  return normalizePath(pathname).split('/').filter(Boolean);
}

/** Routes where the global FAB must not appear (form/modal screens). */
const HIDDEN_SEGMENTS = new Set(['feedback', 'settings', 'onboarding', 'profile']);
const HIDDEN_PATHS = new Set([
  '/(tabs)/marketplace/new',
  '/marketplace/new',
  '/(tabs)/traffic/new',
  '/traffic/new',
  // The network map is a full-bleed map with its own controls at every corner
  // — search top-left, zoom top-right, the focused-stop stepper along the
  // bottom. The FAB lands on top of the stepper.
  '/(tabs)/transit/network',
  '/transit/network',
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
  traffic: 'homeTrafficTitle',
  tours: 'navBarToursLabel',
  weather: 'navBarWeatherLabel',
  settings: 'settingsTitle',
};

export function getScreenLabelKey(pathname: string): string | null {
  return SEGMENT_LABEL_KEY[firstSegment(pathname)] ?? null;
}

/** Module icon for collapsed FAB when no contextual action is registered. */
export function getModuleIcon(pathname: string): LucideIcon | null {
  const seg = firstSegment(pathname);
  return MODULE_ICON_BY_SEGMENT[seg] ?? null;
}

const planTrip: FabAction = {
  key: 'plan-trip',
  labelKey: 'fabPlanTrip',
  icon: Map,
  href: '/(tabs)/transit/directions' as Href,
};

const suggestSource: FabAction = {
  key: 'suggest-source',
  labelKey: 'fabSuggestSource',
  icon: Newspaper,
  href: { pathname: '/feedback', params: { category: 'feature', preset: 'newsSource' } } as Href,
};

const suggestTrail: FabAction = {
  key: 'suggest-trail',
  labelKey: 'fabSuggestTrail',
  icon: Mountain,
  href: { pathname: '/feedback', params: { category: 'feature', preset: 'trail' } } as Href,
};

/**
 * Static, stateless contextual actions for a given route. Stateful per-screen
 * actions are injected separately via `useFabActions` (see `lib/fab-store.ts`).
 */
export function getStaticActions(pathname: string): FabAction[] {
  const parts = routeParts(pathname);
  const seg = parts[0] ?? 'hub';
  const sub = parts[1];

  if (seg === 'hub' || parts.length === 0) {
    return [planTrip];
  }

  if (seg === 'transit') {
    if (!sub) {
      return [
        planTrip,
        {
          key: 'my-favorites',
          labelKey: 'fabMyFavorites',
          icon: Star,
          href: '/profile' as Href,
        },
      ];
    }
    if (sub === 'directions') {
      return [
        {
          key: 'bus-search',
          labelKey: 'fabBusSearch',
          icon: Bus,
          href: '/(tabs)/transit' as Href,
        },
      ];
    }
    return [planTrip];
  }

  if (seg === 'news') {
    return [suggestSource];
  }

  if (seg === 'trails') {
    return [suggestTrail];
  }

  if (seg === 'traffic' && sub) {
    return [
      {
        key: 'report-another',
        labelKey: 'fabReportAnother',
        icon: Plus,
        href: '/(tabs)/traffic' as Href,
      },
    ];
  }

  if (seg === 'tours' && !sub) {
    return [
      {
        key: 'browse-viator',
        labelKey: 'fabBrowseViator',
        icon: ExternalLink,
        onPress: () => openViatorExternal(VIATOR_FALLBACK_URL),
      },
    ];
  }

  return [];
}
