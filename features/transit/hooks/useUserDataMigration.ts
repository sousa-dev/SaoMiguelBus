/**
 * Run the §5d migration when the network actually changes.
 *
 * It hangs off the same signal as the query invalidation — the stop list for the
 * active dataset — rather than a date literal, so it works whenever the cutover
 * happens, including if the concession slips. When `useScheduleTransition`
 * invalidates at `nextTransitionAt`, the stops refetch, this sees the new list
 * and re-points what the user saved.
 */

import { useEffect, useRef } from 'react';

import { migrateUserData } from '@/features/transit/lib/user-data-migration';
import { useStops } from '@/features/transit/hooks/useTransitQueries';
import { useResolvedTransitDataset } from '@/features/transit/hooks/useScheduleConfig';
import { useProfileStore } from '@/lib/profile-store';

export function useUserDataMigration(): void {
  const { data: stops } = useStops();
  // Pins are stamped with the network they resolve against, and active tracks
  // that belong to the other one are dropped (09 §3.5).
  const dataset = useResolvedTransitDataset();
  const applyUserDataMigration = useProfileStore((s) => s.applyUserDataMigration);
  const lastSignature = useRef<string | null>(null);

  useEffect(() => {
    if (!stops?.length) {
      // No stop list means the pickers have not loaded. Migrating against an
      // empty list would flag every favourite as unavailable.
      return;
    }

    // Only re-run when the network itself changed, not on every render. The
    // dataset joins the signature so a preview toggle re-resolves pins too.
    const signature = `${dataset ?? ''}:${stops.length}:${stops[0]?.id ?? ''}:${stops[stops.length - 1]?.id ?? ''}`;
    if (lastSignature.current === signature) {
      return;
    }
    lastSignature.current = signature;

    const state = useProfileStore.getState();
    const result = migrateUserData(
      {
        favoriteStops: state.favoriteStops,
        favoriteRoutes: state.favoriteRoutes,
        recentSearches: state.recentSearches,
        pinned: state.tracking.pinned,
        active: state.tracking.active,
      },
      stops,
      dataset,
    );
    if (result.changed) {
      applyUserDataMigration(result);
    }
  }, [stops, dataset, applyUserDataMigration]);
}
