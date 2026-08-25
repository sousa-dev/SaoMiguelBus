import { stopDisplayNameFromCirculations } from '@/features/minibus/lib/liveEtas';
import {
  formatVehicleStatusLabel,
  normalizeVehicleStatus,
} from '@/features/minibus/lib/vehicleStatus';
import type { MinibusVehicleDetail, MinibusVehicleSummary } from '@/lib/types';

type FleetSubtitleTranslate = (
  key: string,
  options?: Record<string, string | number>,
) => string;

/** Secondary line for a live fleet list row (current stop when known). */
export function fleetVehicleListSubtitle(
  vehicle: MinibusVehicleSummary,
  detail: MinibusVehicleDetail | undefined,
  t: FleetSubtitleTranslate,
): string {
  const stopName = detail
    ? stopDisplayNameFromCirculations(detail.journey?.circulations, detail.currentStopSequence)
    : null;

  if (stopName) {
    const statusKey = normalizeVehicleStatus(vehicle.status);
    switch (statusKey) {
      case 'idleAt':
        return t('minibusLiveFleetAtStop', { stop: stopName });
      case 'incomingAt':
        return t('minibusLiveFleetApproachingStop', { stop: stopName });
      case 'inTransitTo':
        return t('minibusLiveVehicleStatusInTransitToStop', { stop: stopName });
      default:
        return stopName;
    }
  }

  if (vehicle.fleetId) {
    return t('minibusLiveFleetId', { id: vehicle.fleetId });
  }

  return formatVehicleStatusLabel(vehicle.status, t);
}
