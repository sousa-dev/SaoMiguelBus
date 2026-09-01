import { liveMapHref } from '@/features/live-tracking/lib/liveMapHref';

export const AZORESBUS_LIVE_PATH = '/(tabs)/transit/live';

/**
 * Kept apart from `openLiveTracking` so it is reachable from a unit test: that
 * module imports `InteractionManager`, which the node runner cannot load.
 */
export function azoresbusLiveHref(lineCode?: string | null) {
  return liveMapHref(AZORESBUS_LIVE_PATH, lineCode);
}

/**
 * Open the live map focused on one bus.
 *
 * A separate param from `line` rather than a reuse of it: arriving from a stop
 * means "show me THIS bus", and filtering the map to its line as well would
 * hide the others the rider might switch to.
 */
export function azoresbusLiveVehicleHref(vehicleId: string) {
  return `${AZORESBUS_LIVE_PATH}?vehicle=${encodeURIComponent(vehicleId)}` as ReturnType<
    typeof liveMapHref
  >;
}
