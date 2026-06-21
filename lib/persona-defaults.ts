import type { ModuleKey } from '@/config/island';
import type { UserType } from '@/lib/types';

/** Keep in sync with hub-store PIN_CAP. */
const PIN_CAP = 4;

/** Mirror declaration order in lib/modules.tsx HUB_MODULES. */
const DEFAULT_MODULE_ORDER: ModuleKey[] = [
  'transit',
  'minibus',
  'news',
  'seismic',
  'trails',
  'marketplace',
  'traffic',
  'events',
  'weather',
];

/** Hub modules selectable during personalization (excludes seismic). */
export const PERSONALIZABLE_INTERESTS: ModuleKey[] = DEFAULT_MODULE_ORDER.filter(
  (key) => key !== 'seismic',
);

const USER_TYPE_PIN_DEFAULTS: Record<UserType, ModuleKey[]> = {
  tourist: ['events', 'trails', 'weather', 'transit'],
  resident: ['transit', 'minibus', 'traffic', 'news'],
  newcomer: ['transit', 'marketplace', 'news', 'events'],
};

function uniqueKeys(keys: ModuleKey[]): ModuleKey[] {
  const seen = new Set<ModuleKey>();
  const out: ModuleKey[] = [];
  for (const key of keys) {
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(key);
  }
  return out;
}

function orderWithInterestsFirst(interests: ModuleKey[]): ModuleKey[] {
  const interestSet = new Set(interests);
  const prioritized = interests.filter((key) => DEFAULT_MODULE_ORDER.includes(key));
  const rest = DEFAULT_MODULE_ORDER.filter((key) => !interestSet.has(key));
  return [...prioritized, ...rest];
}

function buildPinnedKeys(userType: UserType | null, interests: ModuleKey[]): ModuleKey[] {
  const typeDefaults = userType ? USER_TYPE_PIN_DEFAULTS[userType] : [];
  const merged = uniqueKeys([...interests, ...typeDefaults]);
  return merged.slice(0, PIN_CAP);
}

export function personaHubDefaults(
  userType: UserType | null,
  interests: ModuleKey[],
): { moduleOrderKeys: ModuleKey[]; pinnedKeys: ModuleKey[] } {
  const normalizedInterests = uniqueKeys(
    interests.filter((key) => DEFAULT_MODULE_ORDER.includes(key)),
  );
  return {
    moduleOrderKeys: orderWithInterestsFirst(normalizedInterests),
    pinnedKeys: buildPinnedKeys(userType, normalizedInterests),
  };
}
