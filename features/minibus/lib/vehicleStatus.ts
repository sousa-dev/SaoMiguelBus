export type MinibusVehicleStatusKey =
  | 'incomingAt'
  | 'idleAt'
  | 'inTransitTo'
  | 'ontime'
  | 'delayed'
  | 'unknown';

const STATUS_KEY_BY_UPSTREAM: Readonly<Record<string, MinibusVehicleStatusKey>> = {
  incomingAt: 'incomingAt',
  incoming_at: 'incomingAt',
  INCOMING_AT: 'incomingAt',
  idleAt: 'idleAt',
  idle_at: 'idleAt',
  stoppedAt: 'idleAt',
  stopped_at: 'idleAt',
  STOPPED_AT: 'idleAt',
  inTransitTo: 'inTransitTo',
  in_transit_to: 'inTransitTo',
  IN_TRANSIT_TO: 'inTransitTo',
  ontime: 'ontime',
  on_time: 'ontime',
  onTime: 'ontime',
  ON_TIME: 'ontime',
  delayed: 'delayed',
  late: 'delayed',
  DELAYED: 'delayed',
};

const STATUS_I18N_KEY: Readonly<Record<MinibusVehicleStatusKey, string>> = {
  incomingAt: 'minibusLiveVehicleStatusIncomingAt',
  idleAt: 'minibusLiveVehicleStatusIdleAt',
  inTransitTo: 'minibusLiveVehicleStatusInTransitTo',
  ontime: 'minibusLiveVehicleStatusOnTime',
  delayed: 'minibusLiveVehicleStatusDelayed',
  unknown: 'minibusLiveVehicleStatusUnknown',
};

type StatusTranslate = (
  key: string,
  options?: { defaultValue?: string; stop?: string },
) => string;

export type VehicleStatusLabelOptions = {
  nextStopName?: string | null;
};

export function normalizeVehicleStatus(status: string | null | undefined): MinibusVehicleStatusKey {
  if (!status?.trim()) {
    return 'unknown';
  }
  return STATUS_KEY_BY_UPSTREAM[status.trim()] ?? 'unknown';
}

function humanizeRawStatus(status: string): string {
  const spaced = status
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
  if (!spaced) {
    return status;
  }
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export function formatVehicleStatusLabel(
  status: string | null | undefined,
  t: StatusTranslate,
  options?: VehicleStatusLabelOptions,
): string {
  const key = normalizeVehicleStatus(status);
  if (key === 'unknown') {
    const raw = status?.trim();
    return raw ? humanizeRawStatus(raw) : t(STATUS_I18N_KEY.unknown);
  }
  const nextStopName = options?.nextStopName?.trim();
  if (key === 'inTransitTo' && nextStopName) {
    return t('minibusLiveVehicleStatusInTransitToStop', { stop: nextStopName });
  }
  return t(STATUS_I18N_KEY[key]);
}
