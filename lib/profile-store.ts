import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { staticIslandConfig } from '@/config/island';
import { track } from '@/lib/analytics';
import type { TransitDataset, TripStop } from '@/lib/types';

export interface FavoriteRoute {
  origin: string;
  destination: string;
  createdAt: string;
}

export interface FavoriteStop {
  id: number;
  name: string;
}

export interface RecentSearch {
  origin: string;
  destination: string;
  day: string;
  time: string;
  at: string;
}

export type TripVote = 'like' | 'dislike';

export interface TripVoteEntry {
  vote: TripVote;
  routeNumber: string;
  origin: string;
  destination: string;
  votedAt: string;
}

export type TripVoteMeta = Pick<TripVoteEntry, 'routeNumber' | 'origin' | 'destination'>;

export interface ActiveTrack {
  id: string;
  tripId: number;
  routeNumber: string;
  origin: string;
  destination: string;
  searchDay: string;
  searchDate: string;
  stops: TripStop[];
  nextDeparture: string;
  estimatedArrival: string;
  expiresAt: number;
  createdAt: number;
}

export interface PinnedRoute {
  id: string;
  tripId: number;
  routeNumber: string;
  origin: string;
  destination: string;
  searchDay: string;
  stops: TripStop[];
  pinnedAt: number;
}

export interface TrackingState {
  active: ActiveTrack[];
  pinned: PinnedRoute[];
  lastCleanup: number;
}

const MAX_RECENTS = 10;
const MAX_ACTIVE_TRACKS = 5;
const ACTIVE_TRACK_TTL_MS = 4 * 60 * 60 * 1000;

export function profileStorageKey() {
  return `azores_hub_profile_${staticIslandConfig.islandKey}`;
}

function legacyFavoritesKey() {
  return `azores_hub_favorites_${staticIslandConfig.islandKey}`;
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

function recentKey(search: Pick<RecentSearch, 'origin' | 'destination' | 'day'>) {
  return `${pairKey(search.origin, search.destination)}|${search.day}`;
}

function newTrackId() {
  return `track_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface ProfileState {
  displayName: string | null;
  favoriteRoutes: FavoriteRoute[];
  favoriteStops: FavoriteStop[];
  recentSearches: RecentSearch[];
  votes: Record<number, TripVoteEntry>;
  tracking: TrackingState;
  /**
   * The changeover preview toggle (03 §1). Cleared automatically once the server
   * stops offering a preview, so an August toggle does not strand a user in a
   * meaningless mode in September.
   */
  transitPreviewDataset: TransitDataset | null;
  /** Which schedule banner the user dismissed, keyed on `banner.id`. */
  dismissedScheduleBannerId: string | null;
  setDisplayName: (name: string | null) => void;
  setTransitPreviewDataset: (dataset: TransitDataset | null) => void;
  dismissScheduleBanner: (bannerId: string) => void;
  isFavoriteRoute: (origin: string, destination: string) => boolean;
  toggleFavoriteRoute: (origin: string, destination: string) => void;
  removeFavoriteRoute: (origin: string, destination: string) => void;
  isFavoriteStop: (stopId: number) => boolean;
  toggleFavoriteStop: (stop: FavoriteStop) => void;
  removeFavoriteStop: (stopId: number) => void;
  addRecentSearch: (search: Omit<RecentSearch, 'at'>) => void;
  clearRecentSearches: () => void;
  getVote: (tripId: number) => TripVote | undefined;
  setVote: (tripId: number, vote: TripVote | undefined, meta?: TripVoteMeta) => void;
  clearVotes: () => void;
  startTracking: (input: Omit<ActiveTrack, 'id' | 'createdAt' | 'expiresAt'>) => boolean;
  stopTracking: (trackId: string) => void;
  pinRoute: (input: Omit<PinnedRoute, 'id' | 'pinnedAt'>) => boolean;
  unpinRoute: (pinId: string) => void;
  pruneTracking: (now?: number) => void;
  /** Wipe all on-device profile data (used by the GDPR "delete my data" flow). */
  resetAll: () => void;
}

const defaultTracking = (): TrackingState => ({
  active: [],
  pinned: [],
  lastCleanup: Date.now(),
});

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      displayName: null,
      favoriteRoutes: [],
      favoriteStops: [],
      recentSearches: [],
      votes: {},
      tracking: defaultTracking(),
      transitPreviewDataset: null,
      dismissedScheduleBannerId: null,

      setDisplayName: (name) => {
        const trimmed = name?.trim();
        set({ displayName: trimmed ? trimmed : null });
      },

      setTransitPreviewDataset: (dataset) => set({ transitPreviewDataset: dataset }),

      dismissScheduleBanner: (bannerId) => set({ dismissedScheduleBannerId: bannerId }),

      isFavoriteRoute: (origin, destination) => {
        const key = pairKey(origin, destination);
        return get().favoriteRoutes.some((r) => pairKey(r.origin, r.destination) === key);
      },

      toggleFavoriteRoute: (origin, destination) => {
        const pair = normalizePair(origin, destination);
        if (!pair.origin || !pair.destination) {
          return;
        }
        const key = pairKey(pair.origin, pair.destination);
        const existing = get().favoriteRoutes.find((r) => pairKey(r.origin, r.destination) === key);
        if (existing) {
          set({
            favoriteRoutes: get().favoriteRoutes.filter((r) => pairKey(r.origin, r.destination) !== key),
          });
          track('transit', 'engage', {
            action: 'remove_favorite',
            origin: pair.origin,
            destination: pair.destination,
          });
          return;
        }
        set({
          favoriteRoutes: [{ ...pair, createdAt: new Date().toISOString() }, ...get().favoriteRoutes],
        });
        track('transit', 'engage', {
          action: 'add_favorite',
          origin: pair.origin,
          destination: pair.destination,
        });
      },

      removeFavoriteRoute: (origin, destination) => {
        const key = pairKey(origin, destination);
        set({
          favoriteRoutes: get().favoriteRoutes.filter((r) => pairKey(r.origin, r.destination) !== key),
        });
      },

      isFavoriteStop: (stopId) => get().favoriteStops.some((s) => s.id === stopId),

      toggleFavoriteStop: (stop) => {
        const exists = get().favoriteStops.some((s) => s.id === stop.id);
        if (exists) {
          set({ favoriteStops: get().favoriteStops.filter((s) => s.id !== stop.id) });
          track('transit', 'engage', { action: 'remove_favorite_stop', stop_id: stop.id });
          return;
        }
        set({ favoriteStops: [stop, ...get().favoriteStops] });
        track('transit', 'engage', { action: 'add_favorite_stop', stop_id: stop.id });
      },

      removeFavoriteStop: (stopId) => {
        set({ favoriteStops: get().favoriteStops.filter((s) => s.id !== stopId) });
      },

      addRecentSearch: (search) => {
        const entry: RecentSearch = { ...search, at: new Date().toISOString() };
        const key = recentKey(entry);
        const rest = get().recentSearches.filter((r) => recentKey(r) !== key);
        set({ recentSearches: [entry, ...rest].slice(0, MAX_RECENTS) });
      },

      clearRecentSearches: () => set({ recentSearches: [] }),

      getVote: (tripId) => get().votes[tripId]?.vote,

      setVote: (tripId, vote, meta) => {
        const next = { ...get().votes };
        if (vote) {
          const existing = next[tripId];
          next[tripId] = {
            vote,
            routeNumber: meta?.routeNumber ?? existing?.routeNumber ?? '',
            origin: meta?.origin ?? existing?.origin ?? '',
            destination: meta?.destination ?? existing?.destination ?? '',
            votedAt: new Date().toISOString(),
          };
        } else {
          delete next[tripId];
        }
        set({ votes: next });
      },

      clearVotes: () => set({ votes: {} }),

      startTracking: (input) => {
        get().pruneTracking();
        const { tracking } = get();
        const duplicate = tracking.active.find(
          (t) =>
            t.tripId === input.tripId &&
            t.origin === input.origin &&
            t.destination === input.destination &&
            t.searchDay === input.searchDay,
        );
        if (duplicate) {
          return false;
        }
        if (tracking.active.length >= MAX_ACTIVE_TRACKS) {
          return false;
        }
        const now = Date.now();
        const trackEntry: ActiveTrack = {
          ...input,
          id: newTrackId(),
          createdAt: now,
          expiresAt: now + ACTIVE_TRACK_TTL_MS,
        };
        set({
          tracking: {
            ...tracking,
            active: [...tracking.active, trackEntry],
          },
        });
        track('transit', 'track_start', {
          trip_id: input.tripId,
          route: input.routeNumber,
        });
        return true;
      },

      stopTracking: (trackId) => {
        const { tracking } = get();
        set({
          tracking: {
            ...tracking,
            active: tracking.active.filter((t) => t.id !== trackId),
          },
        });
        track('transit', 'track_stop', { track_id: trackId });
      },

      pinRoute: (input) => {
        const { tracking } = get();
        const duplicate = tracking.pinned.find(
          (p) =>
            p.tripId === input.tripId &&
            p.origin === input.origin &&
            p.destination === input.destination,
        );
        if (duplicate) {
          return false;
        }
        const pin: PinnedRoute = {
          ...input,
          id: newTrackId(),
          pinnedAt: Date.now(),
        };
        set({
          tracking: {
            ...tracking,
            pinned: [...tracking.pinned, pin],
          },
        });
        track('transit', 'track_pin', { trip_id: input.tripId, route: input.routeNumber });
        return true;
      },

      unpinRoute: (pinId) => {
        const { tracking } = get();
        set({
          tracking: {
            ...tracking,
            pinned: tracking.pinned.filter((p) => p.id !== pinId),
          },
        });
        track('transit', 'track_stop', { track_id: pinId, kind: 'pin' });
      },

      pruneTracking: (now = Date.now()) => {
        const { tracking } = get();
        const active = tracking.active.filter((t) => t.expiresAt > now);
        if (active.length === tracking.active.length) {
          return;
        }
        set({
          tracking: {
            ...tracking,
            active,
            lastCleanup: now,
          },
        });
      },

      resetAll: () => {
        set({
          displayName: null,
          favoriteRoutes: [],
          favoriteStops: [],
          recentSearches: [],
          votes: {},
          tracking: defaultTracking(),
          transitPreviewDataset: null,
          dismissedScheduleBannerId: null,
        });
      },
    }),
    {
      name: profileStorageKey(),
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted, version) => {
        type PersistedSlice = Pick<
          ProfileState,
          'displayName' | 'favoriteRoutes' | 'favoriteStops' | 'recentSearches' | 'votes' | 'tracking'
        >;
        const state = persisted as PersistedSlice;
        if (version >= 2 || !state.votes) {
          return persisted as PersistedSlice;
        }
        const migrated: Record<number, TripVoteEntry> = {};
        for (const [key, value] of Object.entries(state.votes)) {
          const tripId = Number(key);
          if (typeof value === 'string' && (value === 'like' || value === 'dislike')) {
            migrated[tripId] = {
              vote: value,
              routeNumber: '',
              origin: '',
              destination: '',
              votedAt: new Date(0).toISOString(),
            };
          } else if (value && typeof value === 'object' && 'vote' in value) {
            migrated[tripId] = value as TripVoteEntry;
          }
        }
        return { ...state, votes: migrated };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          return;
        }
        void migrateLegacyFavorites();
      },
    },
  ),
);

/** One-time import from `azores_hub_favorites_{island}` persisted blob. */
export async function migrateLegacyFavorites() {
  const legacyKey = legacyFavoritesKey();
  const raw = await AsyncStorage.getItem(legacyKey);
  if (!raw) {
    return;
  }
  try {
    const parsed = JSON.parse(raw) as { state?: { routes?: FavoriteRoute[] } };
    const routes = parsed.state?.routes ?? [];
    if (routes.length > 0) {
      const current = useProfileStore.getState().favoriteRoutes;
      if (current.length === 0) {
        useProfileStore.setState({ favoriteRoutes: routes });
      }
    }
    await AsyncStorage.removeItem(legacyKey);
  } catch {
    // ignore corrupt legacy blob
  }
}

/** Map UI vote intent + ledger state → API vote verb. */
export function resolveVoteVerb(
  current: TripVote | undefined,
  intent: TripVote,
): 'like' | 'dislike' | 'undo_like' | 'undo_dislike' | 'switch_to_like' {
  if (!current) {
    return intent;
  }
  if (current === intent) {
    return intent === 'like' ? 'undo_like' : 'undo_dislike';
  }
  if (current === 'dislike' && intent === 'like') {
    return 'switch_to_like';
  }
  return intent;
}
