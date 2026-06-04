import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Entitlement } from '@/lib/types';

const ENTITLEMENT_KEY = 'azores_hub_entitlement';

interface EntitlementState {
  /** Last-known entitlement from the API. Persisted so offline premium keeps working. */
  entitlement: Entitlement | null;
  setEntitlement: (entitlement: Entitlement | null) => void;
  clearEntitlement: () => void;
}

export const useEntitlementStore = create<EntitlementState>()(
  persist(
    (set) => ({
      entitlement: null,
      setEntitlement: (entitlement) => set({ entitlement }),
      clearEntitlement: () => set({ entitlement: null }),
    }),
    {
      name: ENTITLEMENT_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ entitlement: state.entitlement }),
    },
  ),
);

/** Non-hook snapshot accessor (for use outside React). */
export function getEntitlement(): Entitlement | null {
  return useEntitlementStore.getState().entitlement;
}
