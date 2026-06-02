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

export function getEnabledHubModules(enabledKeys: ModuleKey[]): HubModule[] {
  const set = new Set(enabledKeys);
  return HUB_MODULES.filter((m) => set.has(m.key));
}
