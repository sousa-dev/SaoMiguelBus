import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getEntitlement, useEntitlementStore } from '@/lib/entitlement-store';

const PREMIUM_KEY = 'azores_hub_premium';

interface PremiumState {
  /**
   * DEV-only override to force premium for testing. Real premium comes from the
   * live entitlement (see `usePremium`); this override only applies in __DEV__.
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
 *
 * Resolves from the live entitlement (fetched from `GET /api/v3/billing/entitlement`
 * and cached in the entitlement store), fail-safe to `false` when unknown or
 * signed out. The `__DEV__` override forces premium for testing only.
 */
export function usePremium(): boolean {
  const devOverride = usePremiumStore((s) => s.devOverride);
  const isPremium = useEntitlementStore((s) => s.entitlement?.tier === 'premium');
  return __DEV__ ? devOverride || isPremium : isPremium;
}

/** Non-hook accessor for use outside React (e.g. sync logic). */
export function getIsPremium(): boolean {
  const isPremium = getEntitlement()?.tier === 'premium';
  return __DEV__ ? usePremiumStore.getState().devOverride || isPremium : isPremium;
}
