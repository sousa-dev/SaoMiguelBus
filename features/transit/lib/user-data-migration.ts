/**
 * Re-point saved user data at the active network (03 §5d).
 *
 * `FavoriteStop` stores a `Stop` PRIMARY KEY. Legacy and AzoresBus stop PKs come
 * from the same sequence, so after the cutover a saved id either points at a stop
 * that is no longer in the active dataset or silently resolves to an unrelated
 * AzoresBus stop holding that PK. Re-resolving by NAME is the fix; the name is
 * also what the user recognises.
 *
 * Nothing the user created is deleted. Favourites that cannot be resolved are
 * kept and flagged, because someone who opens the app on 1 September to find
 * their saved stops gone reads that as data loss.
 *
 * Recents are the exception: they are disposable, so unresolvable ones are
 * filtered rather than repaired. Spending repair UI on them is not worth it.
 *
 * Pinned itineraries follow the favourites policy for the same reasons, plus one
 * of their own: they never expire and have no cap, so they are the oldest data
 * in the app and the most likely to point at a network that no longer exists
 * (09 §3.5). Active tracks are the other exception — they are dropped outright
 * on a dataset change, because a countdown against the old timetable has no
 * useful degraded form.
 *
 * A village search ("Capelas") is a valid, working search term (AzoresBus
 * only), but it is not a literal `Stop.name` — it only exists as a derived
 * grouping over 2+ real stops. `resolveFavoriteRoutes`/`resolveRecentSearches`
 * treat it as resolvable; `resolveFavoriteStops` deliberately does NOT, since
 * it rewrites a favourite's stored id to whatever it matches, and there is no
 * real `Stop` row for "Capelas" to rewrite to — extending it would silently
 * reassign a stop favourite to an arbitrary member id, the exact PK-reuse
 * failure this file exists to prevent.
 */

import { groupStopsIntoAreas } from '@/lib/stop-areas';
import { foldStopName } from '@/lib/stop-match';
import type {
  ActiveTrack,
  FavoriteRoute,
  FavoriteStop,
  PinnedRoute,
  RecentSearch,
} from '@/lib/profile-store';
import type { Stop, TransitDataset } from '@/lib/types';

export interface MigratableFavoriteStop extends FavoriteStop {
  /** The name no longer exists in the active network. Kept, shown greyed. */
  unavailable?: boolean;
}

export interface MigratableFavoriteRoute extends FavoriteRoute {
  /** Which endpoints no longer resolve, for the tap-to-fix affordance. */
  unresolved?: ('origin' | 'destination')[];
}

function nameIndex(stops: Stop[]): Map<string, Stop> {
  const index = new Map<string, Stop>();
  for (const stop of stops) {
    const key = foldStopName(stop.name);
    if (!index.has(key)) {
      index.set(key, stop);
    }
  }
  return index;
}

function lookup(index: Map<string, Stop>, name: string): Stop | undefined {
  return index.get(foldStopName(name));
}

/** Folded village keys — same fold as `lookup`, so a query and a key agree. */
function foldedAreaKeys(stops: Stop[]): Set<string> {
  return new Set([...groupStopsIntoAreas(stops).keys()].map(foldStopName));
}

/**
 * Resolvable as either a real stop OR a village area — used ONLY by the two
 * string resolvers below, never by `resolveFavoriteStops` (see module doc).
 */
function resolvesToStopOrArea(
  name: string,
  stopIndex: Map<string, Stop>,
  areaKeys: Set<string>,
): boolean {
  const key = foldStopName(name);
  return stopIndex.has(key) || areaKeys.has(key);
}

/**
 * Re-resolve favourite stops by name against the active dataset.
 *
 * An empty stop list means the pickers have not loaded — a no-op, never a wipe.
 */
export function resolveFavoriteStops(
  favorites: MigratableFavoriteStop[],
  stops: Stop[],
): MigratableFavoriteStop[] {
  if (stops.length === 0) {
    return favorites;
  }
  const index = nameIndex(stops);

  return favorites.map((favorite) => {
    const match = lookup(index, favorite.name);
    if (!match) {
      return { ...favorite, unavailable: true };
    }
    // Drop the flag as well as fixing the id: a stop can come back.
    const { unavailable, ...rest } = favorite;
    return { ...rest, id: match.id };
  });
}

/** Flag the endpoints that no longer resolve. Never hide the row. */
export function resolveFavoriteRoutes(
  routes: MigratableFavoriteRoute[],
  stops: Stop[],
): MigratableFavoriteRoute[] {
  if (stops.length === 0) {
    return routes;
  }
  const index = nameIndex(stops);
  const areaKeys = foldedAreaKeys(stops);

  return routes.map((route) => {
    const unresolved: ('origin' | 'destination')[] = [];
    if (!resolvesToStopOrArea(route.origin, index, areaKeys)) {
      unresolved.push('origin');
    }
    if (!resolvesToStopOrArea(route.destination, index, areaKeys)) {
      unresolved.push('destination');
    }
    if (unresolved.length === 0) {
      const { unresolved: _previous, ...rest } = route;
      return rest;
    }
    return { ...route, unresolved };
  });
}

/** Disposable: filter what can no longer be searched rather than repairing it. */
export function resolveRecentSearches(recents: RecentSearch[], stops: Stop[]): RecentSearch[] {
  if (stops.length === 0) {
    return recents;
  }
  const index = nameIndex(stops);
  const areaKeys = foldedAreaKeys(stops);
  return recents.filter(
    (recent) =>
      resolvesToStopOrArea(recent.origin, index, areaKeys) &&
      resolvesToStopOrArea(recent.destination, index, areaKeys),
  );
}

export interface MigratablePinnedRoute extends PinnedRoute {
  /** The endpoints no longer exist in the active network. Kept, shown greyed. */
  unavailable?: boolean;
}

/**
 * Re-point pinned itineraries at the active network (09 §3.5).
 *
 * Pins are the sharp case here for the opposite reason to `FavoriteStop`: they
 * do not expire and have no cap, so a long-standing subscriber's pinned list is
 * the oldest data in the app — and on cutover day every row of it would run a
 * search that quietly returns nothing. That is the worst possible moment for a
 * paying user's saved data to look broken.
 *
 * Policy, same as the favourites resolver:
 *
 *  - resolve BY NAME, treating a village area as resolvable — a pin stores
 *    searchable names, exactly like `FavoriteRoute`;
 *  - resolved → clear the flag, stamp the current dataset, and DROP every
 *    `legs[].tripId`. A trip PK from the other network is worse than none: stop
 *    and trip PKs are reused across datasets, so a kept id silently addresses an
 *    unrelated AzoresBus trip. The pin's job is to re-run a search, and
 *    "Ver horários" needs no trip id;
 *  - unresolved → keep the pin and flag it. Never delete.
 *
 * An empty stop list means the pickers have not loaded — a no-op, never a wipe.
 */
export function resolvePinnedRoutes(
  pinned: MigratablePinnedRoute[],
  stops: Stop[],
  dataset: TransitDataset | null = null,
): MigratablePinnedRoute[] {
  if (stops.length === 0) {
    return pinned;
  }
  const index = nameIndex(stops);
  const areaKeys = foldedAreaKeys(stops);

  return pinned.map((pin) => {
    const resolves =
      resolvesToStopOrArea(pin.origin, index, areaKeys) &&
      resolvesToStopOrArea(pin.destination, index, areaKeys);

    if (!resolves) {
      return { ...pin, unavailable: true };
    }

    // Drop the flag as well as repairing the row: a stop can come back.
    const { unavailable: _previous, ...rest } = pin;
    return {
      ...rest,
      ...(dataset ? { dataset } : {}),
      legs: pin.legs.map(({ tripId: _stale, ...leg }) => leg),
      // The deprecated mirror carries the same stale PK, so it goes too.
      tripId: undefined,
    };
  });
}

/**
 * Active tracks do not survive a network change (09 §3.5).
 *
 * A countdown built from the old network's stop times is wrong the instant the
 * network changes, and unlike a pin it has no useful degraded form — there is
 * nothing to grey out and re-resolve, only a wrong number counting down. They
 * are cheap to recreate and self-limiting anyway, so dropping is the honest
 * answer.
 *
 * Only an EXPLICIT, mismatched stamp drops a track. A null argument means the
 * dataset has not resolved yet; an unstamped track predates the stamp and could
 * equally belong to the current network, and this runs on first load as well as
 * on a real change. Both are left alone and expire on their own.
 */
export function pruneTracksForDataset(
  active: ActiveTrack[],
  dataset: TransitDataset | null,
): ActiveTrack[] {
  if (dataset == null) {
    return active;
  }
  return active.filter((t) => t.dataset == null || t.dataset === dataset);
}

export interface MigratableUserData {
  favoriteStops: MigratableFavoriteStop[];
  favoriteRoutes: MigratableFavoriteRoute[];
  recentSearches: RecentSearch[];
  pinned?: MigratablePinnedRoute[];
  active?: ActiveTrack[];
}

export interface UserDataMigrationResult extends MigratableUserData {
  pinned: MigratablePinnedRoute[];
  active: ActiveTrack[];
  /** False when nothing moved, so the caller can skip writing to the store. */
  changed: boolean;
}

/**
 * The whole migration, as one pure step. Callers run it on the transition the
 * server published — never on a date literal — so it works whenever the cutover
 * actually happens, including if the concession slips.
 */
export function migrateUserData(
  data: MigratableUserData,
  stops: Stop[],
  dataset: TransitDataset | null = null,
): UserDataMigrationResult {
  const favoriteStops = resolveFavoriteStops(data.favoriteStops, stops);
  const favoriteRoutes = resolveFavoriteRoutes(data.favoriteRoutes, stops);
  const recentSearches = resolveRecentSearches(data.recentSearches, stops);
  const pinned = resolvePinnedRoutes(data.pinned ?? [], stops, dataset);
  const active = pruneTracksForDataset(data.active ?? [], dataset);

  const changed =
    JSON.stringify(favoriteStops) !== JSON.stringify(data.favoriteStops) ||
    JSON.stringify(favoriteRoutes) !== JSON.stringify(data.favoriteRoutes) ||
    JSON.stringify(pinned) !== JSON.stringify(data.pinned ?? []) ||
    recentSearches.length !== data.recentSearches.length ||
    active.length !== (data.active ?? []).length;

  return { favoriteStops, favoriteRoutes, recentSearches, pinned, active, changed };
}
