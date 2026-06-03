import type { Href } from 'expo-router';

import type { ModuleKey } from '@/config/island';
import { HUB_TAB, getEnabledHubModules } from '@/lib/modules';
import { MODULE_KEY_TO_TAB_SCREEN } from '@/lib/hub-tab-screens';

/** App entry screen: hub grid or a feature module tab. */
export type LandingPageKey = 'hub' | ModuleKey;

export const DEFAULT_LANDING_PAGE_KEY: LandingPageKey = 'transit';

export function resolveLandingPageKey(
  stored: LandingPageKey | undefined,
  enabledKeys: ModuleKey[],
): LandingPageKey {
  const key = stored ?? DEFAULT_LANDING_PAGE_KEY;
  if (key === 'hub') {
    return 'hub';
  }
  if (key !== 'hub' && enabledKeys.includes(key)) {
    return key;
  }
  if (enabledKeys.includes(DEFAULT_LANDING_PAGE_KEY)) {
    return DEFAULT_LANDING_PAGE_KEY;
  }
  return enabledKeys[0] ?? 'hub';
}

export function landingPageToHref(key: LandingPageKey): Href {
  if (key === 'hub') {
    return '/(tabs)/hub' as Href;
  }
  const screen = MODULE_KEY_TO_TAB_SCREEN[key];
  return `/(tabs)/${screen}` as Href;
}

export type LandingPageOption = {
  key: LandingPageKey;
  labelKey: string;
};

/** Hub first, then enabled modules in user grid order. */
export function getLandingPageOptions(
  enabledKeys: ModuleKey[],
  moduleOrderKeys?: ModuleKey[],
): LandingPageOption[] {
  const hub: LandingPageOption = { key: 'hub', labelKey: HUB_TAB.labelKey };
  const modules = getEnabledHubModules(enabledKeys, moduleOrderKeys).map((m) => ({
    key: m.key as LandingPageKey,
    labelKey: m.labelKey,
  }));
  return [hub, ...modules];
}
