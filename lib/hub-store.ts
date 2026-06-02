import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ModuleKey } from '@/config/island';
import { staticIslandConfig } from '@/config/island';

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

interface HubState {
  pinnedKeys: ModuleKey[];
  layout: HubLayout;
  columns: HubColumns;
  editMode: boolean;
  isPinned: (key: ModuleKey) => boolean;
  canPinMore: () => boolean;
  togglePin: (key: ModuleKey) => boolean;
  reorderPin: (key: ModuleKey, direction: 'up' | 'down') => void;
  setLayout: (layout: HubLayout) => void;
  setColumns: (columns: HubColumns) => void;
  setEditMode: (editMode: boolean) => void;
}

export const useHubStore = create<HubState>()(
  persist(
    (set, get) => ({
      pinnedKeys: [...DEFAULT_PINNED_KEYS],
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
        const idx = pinnedKeys.indexOf(key);
        if (idx < 0) {
          return;
        }
        const swapWith = direction === 'up' ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= pinnedKeys.length) {
          return;
        }
        const next = [...pinnedKeys];
        [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
        set({ pinnedKeys: next });
      },

      setLayout: (layout) => set({ layout }),
      setColumns: (columns) => set({ columns }),
      setEditMode: (editMode) => set({ editMode }),
    }),
    {
      name: `azores_hub_layout_${staticIslandConfig.islandKey}`,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pinnedKeys: state.pinnedKeys,
        layout: state.layout,
        columns: state.columns,
      }),
      migrate: (persisted, version) => {
        const state = persisted as {
          pinnedKeys?: ModuleKey[];
          layout?: HubLayout;
          columns?: HubColumns;
        };
        if (version < 1 && (!state.pinnedKeys || state.pinnedKeys.length === 0)) {
          return {
            ...state,
            pinnedKeys: [...DEFAULT_PINNED_KEYS],
          };
        }
        return state;
      },
    },
  ),
);
