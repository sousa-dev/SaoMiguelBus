import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { staticIslandConfig } from '@/config/island';

export const WEATHER_PIN_CAP = 12;

interface WeatherState {
  pinnedSlugs: string[];
  isPinned: (slug: string) => boolean;
  canPinMore: () => boolean;
  togglePin: (slug: string) => boolean;
}

export const useWeatherStore = create<WeatherState>()(
  persist(
    (set, get) => ({
      pinnedSlugs: [],

      isPinned: (slug) => get().pinnedSlugs.includes(slug),

      canPinMore: () => get().pinnedSlugs.length < WEATHER_PIN_CAP,

      togglePin: (slug) => {
        const { pinnedSlugs } = get();
        const idx = pinnedSlugs.indexOf(slug);
        if (idx >= 0) {
          set({ pinnedSlugs: pinnedSlugs.filter((s) => s !== slug) });
          return true;
        }
        if (pinnedSlugs.length >= WEATHER_PIN_CAP) {
          return false;
        }
        set({ pinnedSlugs: [...pinnedSlugs, slug] });
        return true;
      },
    }),
    {
      name: `azores_hub_weather_pins_${staticIslandConfig.islandKey}`,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ pinnedSlugs: state.pinnedSlugs }),
    },
  ),
);
