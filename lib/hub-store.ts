import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { staticIslandConfig } from '@/config/island';
import type { ModuleKey } from '@/config/island';

const DEFAULT_PINS: ModuleKey[] = ['transit', 'events'];

interface HubStoreState {
  pinnedKeys: ModuleKey[];
  togglePin: (key: ModuleKey) => void;
  setPins: (keys: ModuleKey[]) => void;
}

export const useHubStore = create<HubStoreState>()(
  persist(
    (set, get) => ({
      pinnedKeys: DEFAULT_PINS,
      togglePin: (key) => {
        const current = get().pinnedKeys;
        if (current.includes(key)) {
          set({ pinnedKeys: current.filter((k) => k !== key) });
        } else {
          set({ pinnedKeys: [...current, key] });
        }
      },
      setPins: (keys) => set({ pinnedKeys: keys }),
    }),
    {
      name: `azores_hub_pins_${staticIslandConfig.islandKey}`,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
