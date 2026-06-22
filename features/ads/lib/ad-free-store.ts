import { create } from 'zustand';

import { grantAdFreeWindow, loadAdFreeUntil } from '@/features/ads/lib/ad-free-storage';

interface AdFreeStoreState {
  adFreeUntilMs: number | null;
  nowMs: number;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  grantFromReward: () => Promise<number>;
  tickNow: () => void;
}

let hydratePromise: Promise<void> | null = null;

export const useAdFreeStore = create<AdFreeStoreState>((set, get) => ({
  adFreeUntilMs: null,
  nowMs: Date.now(),
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) {
      return;
    }
    if (!hydratePromise) {
      hydratePromise = (async () => {
        const until = await loadAdFreeUntil();
        set({ adFreeUntilMs: until, nowMs: Date.now(), hydrated: true });
      })();
    }
    await hydratePromise;
  },

  refresh: async () => {
    const until = await loadAdFreeUntil();
    set({ adFreeUntilMs: until, nowMs: Date.now(), hydrated: true });
  },

  grantFromReward: async () => {
    const until = await grantAdFreeWindow();
    set({ adFreeUntilMs: until, nowMs: Date.now(), hydrated: true });
    return until;
  },

  tickNow: () => {
    set({ nowMs: Date.now() });
  },
}));

/** Test-only reset — clears in-memory state and hydration latch. */
export function resetAdFreeStoreForTests(): void {
  hydratePromise = null;
  useAdFreeStore.setState({
    adFreeUntilMs: null,
    nowMs: Date.now(),
    hydrated: false,
  });
}
