import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const PREMIUM_KEY = 'azores_hub_premium';

interface PremiumState {
  /**
   * DEV-only override. Real entitlement (billing) is not built yet, so premium
   * always resolves to `false` in production regardless of this value.
   */
  devOverride: boolean;
  setDevOverride: (value: boolean) => void;
  /** Whether the one-time "download offline data" prompt has been shown. */
  offlinePromptSeen: boolean;
  setOfflinePromptSeen: (value: boolean) => void;
}

export const usePremiumStore = create<PremiumState>()(
  persist(
    (set) => ({
      devOverride: false,
      setDevOverride: (value) => set({ devOverride: value, offlinePromptSeen: false }),
      offlinePromptSeen: false,
      setOfflinePromptSeen: (value) => set({ offlinePromptSeen: value }),
    }),
    {
      name: PREMIUM_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        devOverride: state.devOverride,
        offlinePromptSeen: state.offlinePromptSeen,
      }),
    },
  ),
);

/**
 * Single source of truth for premium entitlement.
 * Returns `false` in production until billing ships; honors the DEV override
 * only in `__DEV__` builds so the premium-only flows can be exercised.
 */
export function usePremium(): boolean {
  const devOverride = usePremiumStore((s) => s.devOverride);
  return __DEV__ ? devOverride : false;
}

/** Non-hook accessor for use outside React (e.g. sync logic). */
export function getIsPremium(): boolean {
  return __DEV__ ? usePremiumStore.getState().devOverride : false;
}
