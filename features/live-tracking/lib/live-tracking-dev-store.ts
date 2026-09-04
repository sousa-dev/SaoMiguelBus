import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const LIVE_TRACKING_DEV_KEY = 'azores_hub_live_tracking_dev';

interface LiveTrackingDevState {
  /**
   * Forces every "Ao vivo" entry (AzoresBus and PDL MiniBus alike) into the
   * same grey/unavailable state a real AVL outage produces, without needing
   * to actually break the upstream feed -- lets QA exercise the "still shown,
   * still tappable, message on the destination screen, ad still there" path
   * on demand.
   */
  forceUnavailable: boolean;
  setForceUnavailable: (value: boolean) => void;
}

export const useLiveTrackingDevStore = create<LiveTrackingDevState>()(
  persist(
    (set) => ({
      forceUnavailable: false,
      setForceUnavailable: (value) => set({ forceUnavailable: value }),
    }),
    {
      name: LIVE_TRACKING_DEV_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ forceUnavailable: state.forceUnavailable }),
    },
  ),
);
