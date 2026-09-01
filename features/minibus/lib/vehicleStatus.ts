/**
 * Moved to `features/live-tracking/lib/vehicleStatus`; this binds the minibus
 * copy namespace so existing call sites keep their two-argument signature.
 */
import {
  formatVehicleStatusLabel as formatLiveVehicleStatusLabel,
  vehicleStatusI18nKeys,
  type VehicleStatusLabelOptions as LiveVehicleStatusLabelOptions,
} from '@/features/live-tracking/lib/vehicleStatus';

export { normalizeVehicleStatus } from '@/features/live-tracking/lib/vehicleStatus';
export type { LiveVehicleStatusKey as MinibusVehicleStatusKey } from '@/features/live-tracking/lib/vehicleStatus';

const MINIBUS_STATUS_KEYS = vehicleStatusI18nKeys('minibusLive');

export type VehicleStatusLabelOptions = Omit<LiveVehicleStatusLabelOptions, 'keys'>;

export function formatVehicleStatusLabel(
  status: string | null | undefined,
  t: Parameters<typeof formatLiveVehicleStatusLabel>[1],
  options?: VehicleStatusLabelOptions,
): string {
  return formatLiveVehicleStatusLabel(status, t, {
    ...options,
    keys: MINIBUS_STATUS_KEYS,
  });
}
