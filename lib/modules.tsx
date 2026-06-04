import type { Href } from 'expo-router';
import {
  Activity,
  Bus,
  CircleUser,
  Crown,
  Footprints,
  LayoutGrid,
  MessageSquarePlus,
  Newspaper,
  Settings,
  Store,
  CloudSun,
  Binoculars,
  Ticket,
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
    labelKey: 'homeTrafficTitle',
    Icon: Binoculars,
    accent: '#ea580c',
  },
  {
    key: 'events',
    route: '/tours',
    labelKey: 'navBarToursLabel',
    Icon: Ticket,
    accent: '#0891b2',
  },
  {
    key: 'weather',
    route: '/weather' as Href,
    labelKey: 'navBarWeatherLabel',
    Icon: CloudSun,
    accent: '#0ea5e9',
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

export type SidebarSectionId = 'hub' | 'modules' | 'app';

/** Sidebar rows that run app logic instead of `router.push(route)`. */
export type SidebarNavAction = 'premium';

export type SidebarNavItem = {
  key: string;
  route: Href;
  labelKey: string;
  Icon: LucideIcon;
  accent?: string;
  section: SidebarSectionId;
  /** Feature module key when `section === 'modules'`. */
  moduleKey?: ModuleKey;
  action?: SidebarNavAction;
};

export type SidebarSection = {
  id: SidebarSectionId;
  /** Omit for hub (single item, no section header). */
  titleKey?: string;
  items: SidebarNavItem[];
};

const hubNavItem: SidebarNavItem = {
  key: HUB_TAB.key,
  route: HUB_TAB.route,
  labelKey: HUB_TAB.labelKey,
  Icon: HUB_TAB.Icon,
  section: 'hub',
};

const moduleNavItems: SidebarNavItem[] = HUB_MODULES.map((m) => ({
  key: m.key,
  route: m.route,
  labelKey: m.labelKey,
  Icon: m.Icon,
  accent: m.accent,
  section: 'modules' as const,
  moduleKey: m.key,
}));

const PREMIUM_ACCENT = '#ca8a04';

const appNavItems: SidebarNavItem[] = [
  {
    key: 'premium',
    route: '/settings',
    labelKey: 'premiumGoPremium',
    Icon: Crown,
    accent: PREMIUM_ACCENT,
    section: 'app',
    action: 'premium',
  },
  {
    key: 'settings',
    route: '/settings',
    labelKey: 'settingsTitle',
    Icon: Settings,
    section: 'app',
  },
  {
    key: 'profile',
    route: '/profile',
    labelKey: 'navBarProfileLabel',
    Icon: CircleUser,
    section: 'app',
  },
  {
    key: 'feedback',
    route: '/feedback',
    labelKey: 'fabSendFeedback',
    Icon: MessageSquarePlus,
    section: 'app',
  },
];

/** Full sidebar catalog: Hub, all shipped modules, app screens. */
export const SIDEBAR_SECTIONS: SidebarSection[] = [
  { id: 'hub', items: [hubNavItem] },
  { id: 'modules', titleKey: 'sidebarSectionModules', items: moduleNavItems },
  { id: 'app', titleKey: 'sidebarSectionApp', items: appNavItems },
];
