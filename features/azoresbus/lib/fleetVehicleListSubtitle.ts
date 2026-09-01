/**
 * The second line of a fleet-bar row.
 *
 * Reads `busStatus`, NOT `status`. On the AzoresBus list endpoint `status` is
 * punctuality -- it is `"ontime"` for essentially every vehicle, essentially
 * always -- while `busStatus` carries the movement state a waiting rider
 * actually wants ("at the stop", "approaching"). Reading the wrong one does not
 * throw or look broken in review; it just renders "A horas" forty times.
 *
 * There is deliberately no per-vehicle detail lookup here. Naming the next stop
 * would need each bus's circulations, which is a detail call per vehicle per
 * poll -- forty round-trips through the Pi to enrich a subtitle. The line name
 * is the honest thing we already have.
 */

import {
  normalizeVehicleStatus,
  vehicleStatusI18nKeys,
  type VehicleStatusI18nKeys,
} from '@/features/live-tracking/lib/vehicleStatus';
import type { AzoresbusVehicleSummary } from '@/lib/types';

export const AZORESBUS_STATUS_KEYS: VehicleStatusI18nKeys =
  vehicleStatusI18nKeys('azoresbusLive');

type SubtitleTranslate = (
  key: string,
  options?: Record<string, string | number>,
) => string;

export function azoresbusFleetVehicleListSubtitle(
  vehicle: Pick<AzoresbusVehicleSummary, 'busStatus' | 'route' | 'delay'>,
  t: SubtitleTranslate,
): string {
  const movement = normalizeVehicleStatus(vehicle.busStatus);
  const routeName = vehicle.route?.name?.trim();

  if (movement !== 'unknown') {
    const label = t(AZORESBUS_STATUS_KEYS[movement]);
    return routeName ? `${label} · ${routeName}` : label;
  }

  return routeName || t('azoresbusLiveRouteUnknown');
}
