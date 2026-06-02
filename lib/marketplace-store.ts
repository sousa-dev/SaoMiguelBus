import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { staticIslandConfig } from '@/config/island';

/**
 * Listing ownership is pseudonymous (server keys on a session hash we can't
 * recompute client-side), so we track which provider ids this device created
 * to decide whether to show Edit/Delete affordances.
 */
interface MarketplaceState {
  myListingIds: number[];
  isMine: (providerId: number) => boolean;
  addListing: (providerId: number) => void;
  removeListing: (providerId: number) => void;
}

export const useMarketplaceStore = create<MarketplaceState>()(
  persist(
    (set, get) => ({
      myListingIds: [],
      isMine: (providerId) => get().myListingIds.includes(providerId),
      addListing: (providerId) =>
        set((state) =>
          state.myListingIds.includes(providerId)
            ? state
            : { myListingIds: [providerId, ...state.myListingIds] },
        ),
      removeListing: (providerId) =>
        set((state) => ({
          myListingIds: state.myListingIds.filter((id) => id !== providerId),
        })),
    }),
    {
      name: `azores_hub_marketplace_${staticIslandConfig.islandKey}`,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
