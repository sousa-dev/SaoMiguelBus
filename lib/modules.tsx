import type { LucideIcon } from 'lucide-react-native';
import {
  Bus,
  CalendarDays,
  Mountain,
  Newspaper,
  ShoppingBag,
  TrafficCone,
  Waves,
} from 'lucide-react-native';
import type { Href } from 'expo-router';

import type { ModuleKey } from '@/config/island';

export type HubModuleDef = {
  key: ModuleKey | 'hub';
  route: Href;
  icon: LucideIcon;
  labelKey: string;
  descriptionKey: string;
};

export const HUB_MODULES: HubModuleDef[] = [
  {
    key: 'transit',
    route: '/(tabs)/transit',
    icon: Bus,
    labelKey: 'navBarSearchLabel',
    descriptionKey: 'hubModuleTransitDesc',
  },
  {
    key: 'events',
    route: '/(tabs)/tours',
    icon: CalendarDays,
    labelKey: 'navBarToursLabel',
    descriptionKey: 'hubModuleToursDesc',
  },
  {
    key: 'news',
    route: '/(tabs)/news',
    icon: Newspaper,
    labelKey: 'navBarNewsLabel',
    descriptionKey: 'hubModuleNewsDesc',
  },
  {
    key: 'seismic',
    route: '/(tabs)/earthquakes',
    icon: Waves,
    labelKey: 'navBarEarthquakesLabel',
    descriptionKey: 'hubModuleSeismicDesc',
  },
  {
    key: 'trails',
    route: '/(tabs)/trails',
    icon: Mountain,
    labelKey: 'navBarTrailsLabel',
    descriptionKey: 'hubModuleTrailsDesc',
  },
  {
    key: 'marketplace',
    route: '/(tabs)/marketplace',
    icon: ShoppingBag,
    labelKey: 'navBarMarketplaceLabel',
    descriptionKey: 'hubModuleMarketplaceDesc',
  },
  {
    key: 'traffic',
    route: '/(tabs)/traffic',
    icon: TrafficCone,
    labelKey: 'navBarTrafficLabel',
    descriptionKey: 'hubModuleTrafficDesc',
  },
];

export function modulesForEnabled(enabled: ModuleKey[]): HubModuleDef[] {
  return HUB_MODULES.filter((m) => enabled.includes(m.key as ModuleKey));
}
