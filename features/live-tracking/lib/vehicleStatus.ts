export type LiveVehicleStatusKey =
  | 'incomingAt'
  | 'idleAt'
  | 'inTransitTo'
  | 'ontime'
  | 'delayed'
  | 'unknown';

const STATUS_KEY_BY_UPSTREAM: Readonly<Record<string, LiveVehicleStatusKey>> = {
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

/** Per-operator i18n keys: the vocabulary is shared, the copy namespace is not. */
export type VehicleStatusI18nKeys = Readonly<
  Record<LiveVehicleStatusKey, string> & { inTransitToStop: string }
>;

export function vehicleStatusI18nKeys(prefix: string): VehicleStatusI18nKeys {
  return {
    incomingAt: `${prefix}VehicleStatusIncomingAt`,
    idleAt: `${prefix}VehicleStatusIdleAt`,
    inTransitTo: `${prefix}VehicleStatusInTransitTo`,
    inTransitToStop: `${prefix}VehicleStatusInTransitToStop`,
    ontime: `${prefix}VehicleStatusOnTime`,
    delayed: `${prefix}VehicleStatusDelayed`,
    unknown: `${prefix}VehicleStatusUnknown`,
  };
}

type StatusTranslate = (
  key: string,
  options?: { defaultValue?: string; stop?: string },
) => string;

export type VehicleStatusLabelOptions = {
  keys: VehicleStatusI18nKeys;
  nextStopName?: string | null;
};

export function normalizeVehicleStatus(status: string | null | undefined): LiveVehicleStatusKey {
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
  options: VehicleStatusLabelOptions,
): string {
  const { keys } = options;
  const key = normalizeVehicleStatus(status);
  if (key === 'unknown') {
    const raw = status?.trim();
    return raw ? humanizeRawStatus(raw) : t(keys.unknown);
  }
  const nextStopName = options.nextStopName?.trim();
  if (key === 'inTransitTo' && nextStopName) {
    return t(keys.inTransitToStop, { stop: nextStopName });
  }
  return t(keys[key]);
}
