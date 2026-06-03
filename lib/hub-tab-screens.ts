import type { ModuleKey } from '@/config/island';

/** Tab navigator screen name for each feature module. */
export const MODULE_KEY_TO_TAB_SCREEN: Record<ModuleKey, string> = {
  transit: 'transit',
  news: 'news',
  seismic: 'earthquakes',
  trails: 'trails',
  marketplace: 'marketplace',
  traffic: 'traffic',
  events: 'tours',
};

export const TAB_SCREEN_TO_MODULE_KEY: Record<string, ModuleKey> = Object.fromEntries(
  Object.entries(MODULE_KEY_TO_TAB_SCREEN).map(([k, v]) => [v, k as ModuleKey]),
) as Record<string, ModuleKey>;

/** Hub first, then pinned modules in user order. */
export function orderedTabScreenNames(pinnedKeys: ModuleKey[], enabledKeys: ModuleKey[]): string[] {
  const enabled = new Set(enabledKeys);
  const names = ['hub'];
  for (const key of pinnedKeys) {
    if (!enabled.has(key)) {
      continue;
    }
    const screen = MODULE_KEY_TO_TAB_SCREEN[key];
    if (screen) {
      names.push(screen);
    }
  }
  return names;
}
