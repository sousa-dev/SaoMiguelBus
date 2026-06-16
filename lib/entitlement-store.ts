import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Entitlement } from '@/lib/types';

const ENTITLEMENT_KEY = 'azores_hub_entitlement';

let entitlementStoreHydrated = false;

export function isEntitlementStoreHydrated(): boolean {
  return entitlementStoreHydrated;
}

/** Test-only reset. */
export function resetEntitlementHydrationForTests(): void {
  entitlementStoreHydrated = false;
}

/** Test-only: simulate AsyncStorage rehydration complete. */
export function markEntitlementStoreHydratedForTests(): void {
  entitlementStoreHydrated = true;
}

/** How long an optimistic (post-purchase) premium unlock is trusted over a lagging backend. */
export const OPTIMISTIC_GRACE_MS = 1000 * 60 * 5;

interface EntitlementState {
  /** Authoritative entitlement from GET /api/v3/billing/entitlement (signed-in only). */
  backendEntitlement: Entitlement | null;
  /** Device entitlement derived from RevenueCat CustomerInfo (works signed out). */
  storeEntitlement: Entitlement | null;
  /**
   * Epoch ms until which an optimistic premium unlock wins over a backend `free`
   * (webhook latency window). Cleared once the backend confirms or the window lapses.
   */
  optimisticUntil: number | null;
  clearBackendEntitlement: () => void;
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
  /** Sync premium state from RevenueCat CustomerInfo (anonymous or bound identity). */
  reconcileFromStore: (entitlement: Entitlement | null) => void;
}

function isPremiumEntitlement(entitlement: Entitlement | null | undefined): boolean {
  return entitlement?.tier === 'premium';
}

/** Merged entitlement for display — backend preferred when both are premium. */
export function selectEntitlement(state: Pick<EntitlementState, 'backendEntitlement' | 'storeEntitlement'>): Entitlement | null {
  const { backendEntitlement, storeEntitlement } = state;
  if (isPremiumEntitlement(backendEntitlement)) {
    return backendEntitlement;
  }
  if (isPremiumEntitlement(storeEntitlement)) {
    return storeEntitlement;
  }
  return backendEntitlement ?? storeEntitlement;
}

export function selectIsPremium(state: Pick<EntitlementState, 'backendEntitlement' | 'storeEntitlement'>): boolean {
  return isPremiumEntitlement(state.backendEntitlement) || isPremiumEntitlement(state.storeEntitlement);
}

export function shouldApplyBackendEntitlement(
  entitlement: Entitlement,
  optimisticUntil: number | null,
  now = Date.now(),
): boolean {
  const withinGrace = optimisticUntil != null && now < optimisticUntil;
  if (withinGrace && entitlement.tier === 'free') {
    return false;
  }
  return true;
}

export const useEntitlementStore = create<EntitlementState>()(
  persist(
    (set, get) => ({
      backendEntitlement: null,
      storeEntitlement: null,
      optimisticUntil: null,
      clearBackendEntitlement: () => set({ backendEntitlement: null }),
      clearEntitlement: () => set({ backendEntitlement: null, storeEntitlement: null, optimisticUntil: null }),
      applyOptimisticPremium: (entitlement) =>
        set({ storeEntitlement: entitlement, optimisticUntil: Date.now() + OPTIMISTIC_GRACE_MS }),
      reconcileFromBackend: (entitlement) => {
        const { optimisticUntil } = get();
        if (!shouldApplyBackendEntitlement(entitlement, optimisticUntil)) {
          return;
        }
        set({ backendEntitlement: entitlement, optimisticUntil: null });
      },
      reconcileFromStore: (entitlement) => set({ storeEntitlement: entitlement }),
    }),
    {
      name: ENTITLEMENT_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        backendEntitlement: state.backendEntitlement,
        storeEntitlement: state.storeEntitlement,
        optimisticUntil: state.optimisticUntil,
      }),
      version: 1,
      migrate: (persisted, version) => {
        if (version === 0) {
          const legacy = persisted as {
            entitlement?: Entitlement | null;
            optimisticUntil?: number | null;
          };
          const legacyEntitlement = legacy.entitlement ?? null;
          const isBackendSource =
            legacyEntitlement?.source != null &&
            legacyEntitlement.source !== 'revenuecat';
          return {
            backendEntitlement: isBackendSource ? legacyEntitlement : null,
            storeEntitlement: isBackendSource ? null : legacyEntitlement,
            optimisticUntil: legacy.optimisticUntil ?? null,
          };
        }
        return persisted as EntitlementState;
      },
      onRehydrateStorage: () => () => {
        entitlementStoreHydrated = true;
      },
    },
  ),
);

/** Non-hook snapshot accessor (for use outside React). */
export function getEntitlement(): Entitlement | null {
  return selectEntitlement(useEntitlementStore.getState());
}
