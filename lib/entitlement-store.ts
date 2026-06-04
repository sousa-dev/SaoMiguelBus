import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Entitlement } from '@/lib/types';

const ENTITLEMENT_KEY = 'azores_hub_entitlement';

/** How long an optimistic (post-purchase) premium unlock is trusted over a lagging backend. */
export const OPTIMISTIC_GRACE_MS = 1000 * 60 * 5;

interface EntitlementState {
  /** Last-known entitlement from the API. Persisted so offline premium keeps working. */
  entitlement: Entitlement | null;
  /**
   * Epoch ms until which an optimistic premium unlock wins over a backend `free`
   * (webhook latency window). Cleared once the backend confirms or the window lapses.
   */
  optimisticUntil: number | null;
  setEntitlement: (entitlement: Entitlement | null) => void;
  clearEntitlement: () => void;
  /**
   * Optimistically unlock premium right after a verified purchase. Held for
   * `OPTIMISTIC_GRACE_MS` so a not-yet-processed webhook can't bounce the user
   * back to free.
   */
  applyOptimisticPremium: (entitlement: Entitlement) => void;
  /**
   * Apply the authoritative backend entitlement. The backend always wins —
   * including downgrades (refunds/revocations) — EXCEPT a `free` result is
   * ignored while an optimistic premium grace window is still open.
   */
  reconcileFromBackend: (entitlement: Entitlement) => void;
}

export const useEntitlementStore = create<EntitlementState>()(
  persist(
    (set, get) => ({
      entitlement: null,
      optimisticUntil: null,
      setEntitlement: (entitlement) => set({ entitlement }),
      clearEntitlement: () => set({ entitlement: null, optimisticUntil: null }),
      applyOptimisticPremium: (entitlement) =>
        set({ entitlement, optimisticUntil: Date.now() + OPTIMISTIC_GRACE_MS }),
      reconcileFromBackend: (entitlement) => {
        const { optimisticUntil } = get();
        const withinGrace = optimisticUntil != null && Date.now() < optimisticUntil;
        if (withinGrace && entitlement.tier === 'free') {
          // Webhook hasn't processed the purchase yet — keep optimistic premium.
          return;
        }
        set({ entitlement, optimisticUntil: null });
      },
    }),
    {
      name: ENTITLEMENT_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ entitlement: state.entitlement, optimisticUntil: state.optimisticUntil }),
    },
  ),
);

/** Non-hook snapshot accessor (for use outside React). */
export function getEntitlement(): Entitlement | null {
  return useEntitlementStore.getState().entitlement;
}
