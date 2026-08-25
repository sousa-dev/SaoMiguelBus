import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ModuleKey } from '@/config/island';
import { staticIslandConfig } from '@/config/island';
import { DEFAULT_LANDING_PAGE_KEY, type LandingPageKey } from '@/lib/landing-page';
import { DEFAULT_MODULE_ORDER_KEYS } from '@/lib/modules';

export type { LandingPageKey };

export const PIN_CAP = 4;

/** Default bottom-bar shortcuts: Routes → Tours → Services → Traffic. */
export const DEFAULT_PINNED_KEYS: ModuleKey[] = [
  'transit',
  'events',
  'marketplace',
  'traffic',
];

export type HubLayout = 'grid' | 'list';
export type HubColumns = 2 | 3;

function swapInOrder(keys: ModuleKey[], key: ModuleKey, direction: 'up' | 'down'): ModuleKey[] {
  const idx = keys.indexOf(key);
  if (idx < 0) {
    return keys;
  }
  const swapWith = direction === 'up' ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= keys.length) {
    return keys;
  }
  const next = [...keys];
  [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
  return next;
}

interface HubState {
  pinnedKeys: ModuleKey[];
  moduleOrderKeys: ModuleKey[];
  landingPageKey: LandingPageKey;
  layout: HubLayout;
  columns: HubColumns;
  editMode: boolean;
  isPinned: (key: ModuleKey) => boolean;
  canPinMore: () => boolean;
  togglePin: (key: ModuleKey) => boolean;
  reorderPin: (key: ModuleKey, direction: 'up' | 'down') => void;
  reorderModule: (key: ModuleKey, direction: 'up' | 'down', enabledKeys: ModuleKey[]) => void;
  setLayout: (layout: HubLayout) => void;
  setColumns: (columns: HubColumns) => void;
  setLandingPageKey: (key: LandingPageKey) => void;
  setEditMode: (editMode: boolean) => void;
  applyPersonaLayout: (layout: { moduleOrderKeys: ModuleKey[]; pinnedKeys: ModuleKey[] }) => void;
}

export const useHubStore = create<HubState>()(
  persist(
    (set, get) => ({
      pinnedKeys: [...DEFAULT_PINNED_KEYS],
      moduleOrderKeys: [...DEFAULT_MODULE_ORDER_KEYS],
      landingPageKey: DEFAULT_LANDING_PAGE_KEY,
      layout: 'grid',
      columns: 2,
      editMode: false,

      isPinned: (key) => get().pinnedKeys.includes(key),

      canPinMore: () => get().pinnedKeys.length < PIN_CAP,

      togglePin: (key) => {
        const { pinnedKeys } = get();
        const idx = pinnedKeys.indexOf(key);
        if (idx >= 0) {
          set({ pinnedKeys: pinnedKeys.filter((k) => k !== key) });
          return true;
        }
        if (pinnedKeys.length >= PIN_CAP) {
          return false;
        }
        set({ pinnedKeys: [...pinnedKeys, key] });
        return true;
      },

      reorderPin: (key, direction) => {
        const { pinnedKeys } = get();
        const next = swapInOrder(pinnedKeys, key, direction);
        if (next !== pinnedKeys) {
          set({ pinnedKeys: next });
        }
      },

      reorderModule: (key, direction, enabledKeys) => {
        const enabledSet = new Set(enabledKeys);
        const { moduleOrderKeys } = get();
        const visibleOrder = moduleOrderKeys.filter((k) => enabledSet.has(k));
        const nextVisible = swapInOrder(visibleOrder, key, direction);
        if (nextVisible === visibleOrder) {
          return;
        }
        const tail = moduleOrderKeys.filter((k) => !enabledSet.has(k));
        set({ moduleOrderKeys: [...nextVisible, ...tail] });
      },

      setLayout: (layout) => set({ layout }),
      setColumns: (columns) => set({ columns }),
      setLandingPageKey: (landingPageKey) => set({ landingPageKey }),
      setEditMode: (editMode) => set({ editMode }),

      applyPersonaLayout: ({ moduleOrderKeys, pinnedKeys }) => {
        set({
          moduleOrderKeys: [...moduleOrderKeys],
          pinnedKeys: pinnedKeys.slice(0, PIN_CAP),
        });
      },
    }),
    {
      name: `azores_hub_layout_${staticIslandConfig.islandKey}`,
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pinnedKeys: state.pinnedKeys,
        moduleOrderKeys: state.moduleOrderKeys,
        landingPageKey: state.landingPageKey,
        layout: state.layout,
        columns: state.columns,
      }),
      migrate: (persisted, version) => {
        const state = persisted as {
          pinnedKeys?: ModuleKey[];
          moduleOrderKeys?: ModuleKey[];
          landingPageKey?: LandingPageKey;
          layout?: HubLayout;
          columns?: HubColumns;
        };
        let next = { ...state };
        if (version < 1 && (!next.pinnedKeys || next.pinnedKeys.length === 0)) {
          next = { ...next, pinnedKeys: [...DEFAULT_PINNED_KEYS] };
        }
        if (version < 2 && (!next.moduleOrderKeys || next.moduleOrderKeys.length === 0)) {
          next = { ...next, moduleOrderKeys: [...DEFAULT_MODULE_ORDER_KEYS] };
        }
        if (version < 3 && !next.landingPageKey) {
          next = { ...next, landingPageKey: DEFAULT_LANDING_PAGE_KEY };
        }
        return next;
      },
    },
  ),
);
