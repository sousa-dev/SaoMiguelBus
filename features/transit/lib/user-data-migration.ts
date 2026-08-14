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
 */

import { foldStopName } from '@/lib/stop-match';
import type { FavoriteRoute, FavoriteStop, RecentSearch } from '@/lib/profile-store';
import type { Stop } from '@/lib/types';

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

  return routes.map((route) => {
    const unresolved: ('origin' | 'destination')[] = [];
    if (!lookup(index, route.origin)) {
      unresolved.push('origin');
    }
    if (!lookup(index, route.destination)) {
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
  return recents.filter(
    (recent) => lookup(index, recent.origin) && lookup(index, recent.destination),
  );
}

export interface MigratableUserData {
  favoriteStops: MigratableFavoriteStop[];
  favoriteRoutes: MigratableFavoriteRoute[];
  recentSearches: RecentSearch[];
}

export interface UserDataMigrationResult extends MigratableUserData {
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
): UserDataMigrationResult {
  const favoriteStops = resolveFavoriteStops(data.favoriteStops, stops);
  const favoriteRoutes = resolveFavoriteRoutes(data.favoriteRoutes, stops);
  const recentSearches = resolveRecentSearches(data.recentSearches, stops);

  const changed =
    JSON.stringify(favoriteStops) !== JSON.stringify(data.favoriteStops) ||
    JSON.stringify(favoriteRoutes) !== JSON.stringify(data.favoriteRoutes) ||
    recentSearches.length !== data.recentSearches.length;

  return { favoriteStops, favoriteRoutes, recentSearches, changed };
}
