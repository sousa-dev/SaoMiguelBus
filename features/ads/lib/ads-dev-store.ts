import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const ADS_DEV_KEY = 'azores_hub_ads_dev';

interface AdsDevState {
  forceInternalAdsFallback: boolean;
  setForceInternalAdsFallback: (value: boolean) => void;
}

export const useAdsDevStore = create<AdsDevState>()(
  persist(
    (set) => ({
      forceInternalAdsFallback: false,
      setForceInternalAdsFallback: (value) => set({ forceInternalAdsFallback: value }),
    }),
    {
      name: ADS_DEV_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        forceInternalAdsFallback: state.forceInternalAdsFallback,
      }),
    },
  ),
);
