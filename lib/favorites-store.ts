import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { staticIslandConfig } from '@/config/island';
import { track } from '@/lib/analytics';

export interface FavoriteRoute {
  origin: string;
  destination: string;
  createdAt: string;
}

interface FavoritesState {
  routes: FavoriteRoute[];
  isFavorite: (origin: string, destination: string) => boolean;
  toggleFavorite: (origin: string, destination: string) => void;
  removeFavorite: (origin: string, destination: string) => void;
}

function normalizePair(origin: string, destination: string) {
  return {
    origin: origin.trim(),
    destination: destination.trim(),
  };
}

function pairKey(origin: string, destination: string) {
  return `${origin.trim().toLowerCase()}|${destination.trim().toLowerCase()}`;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      routes: [],
      isFavorite: (origin, destination) => {
        const key = pairKey(origin, destination);
        return get().routes.some((route) => pairKey(route.origin, route.destination) === key);
      },
      toggleFavorite: (origin, destination) => {
        const pair = normalizePair(origin, destination);
        if (!pair.origin || !pair.destination) {
          return;
        }
        const key = pairKey(pair.origin, pair.destination);
        const existing = get().routes.find((route) => pairKey(route.origin, route.destination) === key);
        if (existing) {
          set({
            routes: get().routes.filter((route) => pairKey(route.origin, route.destination) !== key),
          });
          track('transit', 'engage', {
            action: 'remove_favorite',
            origin: pair.origin,
            destination: pair.destination,
          });
          return;
        }
        set({
          routes: [
            { ...pair, createdAt: new Date().toISOString() },
            ...get().routes,
          ],
        });
        track('transit', 'engage', {
          action: 'add_favorite',
          origin: pair.origin,
          destination: pair.destination,
        });
      },
      removeFavorite: (origin, destination) => {
        const key = pairKey(origin, destination);
        set({
          routes: get().routes.filter((route) => pairKey(route.origin, route.destination) !== key),
        });
      },
    }),
    {
      name: `azores_hub_favorites_${staticIslandConfig.islandKey}`,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
