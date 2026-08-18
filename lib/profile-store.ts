import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { staticIslandConfig } from '@/config/island';
import { track } from '@/lib/analytics';
import { liftTrackedRecord } from '@/lib/bus-tracking';
import type { TransitDataset, TripStop } from '@/lib/types';

export interface FavoriteRoute {
  origin: string;
  destination: string;
  createdAt: string;
  /** Endpoints that no longer resolve, for the tap-to-fix affordance (03 §5d). */
  unresolved?: ('origin' | 'destination')[];
}

export interface FavoriteStop {
  id: number;
  name: string;
  /** Set by the changeover migration when the name has no match (03 §5d). */
  unavailable?: boolean;
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

/**
 * A stop within a tracked leg, with the day it actually falls on.
 *
 * `TripStop.time` is a wall clock with no date, so a leg that crosses midnight
 * reads 23h50 → 00h10 as going BACKWARDS — and `segmentStops` used to sort on
 * that value, silently reordering the leg. `dayOffset` is days after the
 * itinerary's first departure; absent means the same day, which is every
 * daytime leg (09 §3.3).
 */
export interface TrackedStop extends TripStop {
  dayOffset?: number;
}

/** One bus within a pinned/tracked itinerary. Mirrors `TransitRideLeg`, trimmed. */
export interface TrackedLeg {
  /**
   * Optional because the cutover migration DROPS it (09 §3.5): a trip PK from the
   * other network is worse than none, and a pin's job is to re-run a search.
   */
  tripId?: number;
  routeNumber: string;
  /** Board and alight for THIS leg — not the journey endpoints. */
  origin: string;
  destination: string;
  start: string; // 'HHhMM'
  end: string;
  /** Already board..alight-trimmed by the server. */
  stops: TrackedStop[];
  /** Sequences the server chose, so nothing is re-matched by name (98 B7). */
  boardSequence?: number;
  alightSequence?: number;
}

export interface TrackedTransfer {
  at: string;
  from: string;
  waitMinutes: number;
  walkMinutes: number;
  tight: boolean;
}

export interface ActiveTrack {
  id: string;
  routeNumber: string;
  /** Journey endpoints — the first leg's board and the last leg's alight. */
  origin: string;
  destination: string;
  searchDay: string;
  searchDate: string;
  /** The journey id when tracked from a journey card; absent for single trips. */
  journeyId?: string;
  /** Which network this was built against. Absent = created before this change. */
  dataset?: TransitDataset;
  legs: TrackedLeg[];
  transfers: TrackedTransfer[];
  nextDeparture: string;
  estimatedArrival: string;
  expiresAt: number;
  createdAt: number;

  // --- legacy fields, kept for one release so persisted state still reads ---
  /** @deprecated use `legs[0].tripId` */ tripId?: number;
  /** @deprecated use `legs[0].stops` */ stops?: TripStop[];
}

export interface PinnedRoute {
  id: string;
  /** The journey id when pinned from a journey card; absent for legacy pins. */
  journeyId?: string;
  /** Which network this was created against. Absent = created before this change. */
  dataset?: TransitDataset;
  /** `"110"` when direct, `"110 → 205"` across a change. */
  routeNumber: string;
  /** Journey endpoints — the first leg's board and the last leg's alight. */
  origin: string;
  destination: string;
  searchDay: string;
  legs: TrackedLeg[];
  transfers: TrackedTransfer[];
  pinnedAt: number;
  /** Set by the migration when the pin no longer resolves. Shown greyed, never deleted. */
  unavailable?: boolean;

  // --- legacy fields, kept for one release so persisted state still reads ---
  /** @deprecated use `legs[0].tripId` */ tripId?: number;
  /** @deprecated use `legs[0].stops` */ stops?: TripStop[];
}

export interface TrackingState {
  active: ActiveTrack[];
  pinned: PinnedRoute[];
  lastCleanup: number;
}

const MAX_RECENTS = 10;
const MAX_ACTIVE_TRACKS = 5;
const ACTIVE_TRACK_TTL_MS = 4 * 60 * 60 * 1000;
/**
 * Pins were unbounded. Now that each one carries every stop of every leg, an
 * unbounded list is a persisted blob that grows forever (09 §3.2).
 */
export const MAX_PINNED_ROUTES = 20;

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

/**
 * Identity of a pinned/tracked ITINERARY (09 §3.2).
 *
 * The old check was on `tripId` alone, which treats two different itineraries
 * that happen to share a first bus as duplicates — normal on a transfer network,
 * where the 110 feeds several onward routes.
 */
function itineraryKey(entry: {
  journeyId?: string;
  legs?: TrackedLeg[];
  tripId?: number;
  routeNumber?: string;
  origin: string;
  destination: string;
}) {
  const tripIds = (entry.legs ?? []).map((l) => l.tripId).filter((id) => id != null);
  const shape = tripIds.length
    ? tripIds.join(':')
    : // The cutover migration drops trip ids, so identity falls back to the route
      // sequence — `"110 → 205"` still tells two itineraries apart when the PKs
      // that used to are gone.
      (entry.routeNumber ?? String(entry.tripId ?? ''));
  return `${entry.journeyId ?? shape}|${pairKey(entry.origin, entry.destination)}`;
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
  /**
   * Which schedule banner the user dismissed, keyed on `banner.id`.
   *
   * SESSION-SCOPED — deliberately excluded from `partialize`, so a cold start
   * offers the banner again. See the note there.
   */
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
  startTracking: (
    input: Omit<ActiveTrack, 'id' | 'createdAt' | 'expiresAt'> & { expiresAt?: number },
  ) => boolean;
  stopTracking: (trackId: string) => void;
  pinRoute: (input: Omit<PinnedRoute, 'id' | 'pinnedAt'>) => boolean;
  unpinRoute: (pinId: string) => void;
  /**
   * Drops expired tracks, and — when `dataset` is supplied — tracks built against
   * a different network (09 §3.5). Runs every 30s from `useBusTracking`.
   */
  pruneTracking: (now?: number, dataset?: TransitDataset | null) => void;
  /**
   * Re-point saved data at the active network after the changeover (03 §5d, 09 §3.5).
   * Never deletes: unresolvable favourites and pins are kept and flagged.
   */
  applyUserDataMigration: (next: {
    favoriteStops: FavoriteStop[];
    favoriteRoutes: FavoriteRoute[];
    recentSearches: RecentSearch[];
    pinned?: PinnedRoute[];
    /** Tracks that survived the dataset change; the rest are dropped. */
    active?: ActiveTrack[];
  }) => void;
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
        const key = itineraryKey(input);
        const duplicate = tracking.active.find(
          (t) => itineraryKey(t) === key && t.searchDay === input.searchDay,
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
          // A journey with a 50-minute change can outlast the flat 4h TTL that
          // was sized for one bus, so the caller derives it from the itinerary
          // and this is only the fallback (09 §3.3).
          expiresAt: input.expiresAt ?? now + ACTIVE_TRACK_TTL_MS,
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
        const key = itineraryKey(input);
        const duplicate = tracking.pinned.find((p) => itineraryKey(p) === key);
        if (duplicate) {
          return false;
        }
        if (tracking.pinned.length >= MAX_PINNED_ROUTES) {
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

      pruneTracking: (now = Date.now(), dataset) => {
        const { tracking } = get();
        const active = tracking.active.filter((t) => {
          if (t.expiresAt <= now) {
            return false;
          }
          // A countdown built from the old network's stop times is wrong the
          // instant the network changes, and unlike a pin it has no useful
          // degraded form (09 §3.5).
          //
          // Only an EXPLICIT, mismatched stamp drops a track. A null argument
          // means the dataset has not resolved yet, and an unstamped track was
          // created before it ever did — dropping either would clear a track the
          // user started seconds ago, the moment bootstrap landed. Unstamped
          // tracks age out on their own within hours anyway.
          if (dataset != null && t.dataset != null && t.dataset !== dataset) {
            return false;
          }
          return true;
        });
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

      applyUserDataMigration: (next) => {
        const { tracking } = get();
        set({
          favoriteStops: next.favoriteStops,
          favoriteRoutes: next.favoriteRoutes,
          recentSearches: next.recentSearches,
          tracking: {
            ...tracking,
            pinned: next.pinned ?? tracking.pinned,
            active: next.active ?? tracking.active,
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
      // 3 — pinned/active records grew a multi-leg shape (09 §3.1).
      version: 3,
      /**
       * Everything EXCEPT the banner dismissal, which is per-session.
       *
       * The changeover banner announces that the bus network is changing —
       * something a rider needs to actually take in, and something that stays
       * relevant for as long as the phase lasts. A permanent dismissal means
       * one stray tap on the X hides it for good, so it is scoped to the run
       * of the app: tapping X clears it now, the next cold start offers it
       * again. Listed explicitly rather than omitted, so a field added later
       * has to make a deliberate choice about persistence.
       */
      partialize: (state) => ({
        displayName: state.displayName,
        favoriteRoutes: state.favoriteRoutes,
        favoriteStops: state.favoriteStops,
        recentSearches: state.recentSearches,
        votes: state.votes,
        tracking: state.tracking,
        transitPreviewDataset: state.transitPreviewDataset,
      }),
      migrate: (persisted, version) => {
        type PersistedSlice = Pick<
          ProfileState,
          'displayName' | 'favoriteRoutes' | 'favoriteStops' | 'recentSearches' | 'votes' | 'tracking'
        >;
        let state = persisted as PersistedSlice;

        if (version < 2 && state.votes) {
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
          state = { ...state, votes: migrated };
        }

        if (version < 3 && state.tracking) {
          state = {
            ...state,
            tracking: {
              ...state.tracking,
              active: (state.tracking.active ?? []).map(liftTrackedRecord),
              pinned: (state.tracking.pinned ?? []).map(liftTrackedRecord),
            },
          };
        }

        return state;
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          return;
        }
        // `partialize` stops WRITING the dismissal, but blobs saved by earlier
        // versions still carry one, and rehydration merges it straight back
        // over the default — which would keep the banner hidden forever for
        // exactly the users who already tapped X. Clearing here covers those,
        // and is a no-op for everyone else.
        useProfileStore.setState({ dismissedScheduleBannerId: null });
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
