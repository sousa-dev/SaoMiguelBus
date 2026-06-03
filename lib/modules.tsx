import type { Href } from 'expo-router';
import {
  Activity,
  Bus,
  Footprints,
  LayoutGrid,
  Newspaper,
  Store,
  Ticket,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';

import type { ModuleKey } from '@/config/island';

export interface HubModule {
  key: ModuleKey;
  route: Href;
  labelKey: string;
  Icon: LucideIcon;
  accent?: string;
}

/** Hub tab metadata (not a feature module). */
export const HUB_TAB = {
  key: 'hub' as const,
  route: '/hub' as Href,
  labelKey: 'hubTitle',
  Icon: LayoutGrid,
};

export const HUB_MODULES: HubModule[] = [
  {
    key: 'transit',
    route: '/transit',
    labelKey: 'navBarSearchLabel',
    Icon: Bus,
    accent: '#218732',
  },
  {
    key: 'news',
    route: '/news',
    labelKey: 'navBarNewsLabel',
    Icon: Newspaper,
    accent: '#2563eb',
  },
  {
    key: 'seismic',
    route: '/earthquakes',
    labelKey: 'navBarEarthquakesLabel',
    Icon: Activity,
    accent: '#dc2626',
  },
  {
    key: 'trails',
    route: '/trails',
    labelKey: 'navBarTrailsLabel',
    Icon: Footprints,
    accent: '#059669',
  },
  {
    key: 'marketplace',
    route: '/marketplace',
    labelKey: 'navBarMarketplaceLabel',
    Icon: Store,
    accent: '#7c3aed',
  },
  {
    key: 'traffic',
    route: '/traffic',
    labelKey: 'navBarTrafficLabel',
    Icon: TriangleAlert,
    accent: '#ea580c',
  },
  {
    key: 'events',
    route: '/tours',
    labelKey: 'navBarToursLabel',
    Icon: Ticket,
    accent: '#0891b2',
  },
];

const moduleByKey = new Map<ModuleKey, HubModule>(HUB_MODULES.map((m) => [m.key, m]));

export function getModule(key: ModuleKey): HubModule | undefined {
  return moduleByKey.get(key);
}

/** Default hub grid order (matches HUB_MODULES declaration). */
export const DEFAULT_MODULE_ORDER_KEYS: ModuleKey[] = HUB_MODULES.map((m) => m.key);

export function sortModulesByOrder(modules: HubModule[], orderKeys: ModuleKey[]): HubModule[] {
  const index = new Map(orderKeys.map((k, i) => [k, i]));
  return [...modules].sort((a, b) => {
    const ai = index.get(a.key) ?? 999;
    const bi = index.get(b.key) ?? 999;
    return ai - bi;
  });
}

export function getEnabledHubModules(
  enabledKeys: ModuleKey[],
  orderKeys: ModuleKey[] = DEFAULT_MODULE_ORDER_KEYS,
): HubModule[] {
  const set = new Set(enabledKeys);
  const enabled = HUB_MODULES.filter((m) => set.has(m.key));
  return sortModulesByOrder(enabled, orderKeys);
}
