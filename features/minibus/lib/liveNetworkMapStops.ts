import {
  displayStopSequence,
  hasCoordinates,
  lineMapStops,
  stopCoordinate,
} from '@/features/minibus/stopCoordinates';
import { liveJourneyStopsFromCirculations } from '@/features/minibus/lib/liveJourneyStops';
import type {
  MinibusCirculation,
  MinibusLine,
  MinibusNetwork,
  MinibusNetworkLine,
  MinibusNetworkStop,
} from '@/lib/types';

export type MinibusLiveMapStopLine = {
  code: string;
  color: string;
  slug: string;
  sequence: number;
};

export type MinibusLiveMapStopPin = {
  stop: MinibusNetworkStop;
  lineColor: string;
  lines: MinibusLiveMapStopLine[];
};

function coordDedupeKey(stop: MinibusNetworkStop): string | null {
  const coord = stopCoordinate(stop);
  if (!coord) {
    return null;
  }
  return `${coord.latitude.toFixed(5)},${coord.longitude.toFixed(5)}`;
}

function lineMeta(
  networkLine: MinibusNetworkLine,
  catalog: MinibusLine | undefined,
): Omit<MinibusLiveMapStopLine, 'sequence'> {
  return {
    code: catalog?.code ?? networkLine.code,
    color: catalog?.color ?? networkLine.color ?? '#2563eb',
    slug: networkLine.slug,
  };
}

/** Always-visible live map pins from the network catalog (optionally filtered by line). */
export function liveNetworkMapStops(
  network: MinibusNetwork | null,
  catalogLines: MinibusLine[],
  selectedLineSlug: string | null,
): MinibusLiveMapStopPin[] {
  if (!network) {
    return [];
  }

  const catalogBySlug = new Map(catalogLines.map((line) => [line.slug, line]));

  if (selectedLineSlug) {
    const networkLine = network.lines.find((line) => line.slug === selectedLineSlug);
    if (!networkLine) {
      return [];
    }
    const meta = lineMeta(networkLine, catalogBySlug.get(selectedLineSlug));
    return lineMapStops(networkLine.stops)
      .filter(hasCoordinates)
      .map((stop) => ({
        stop,
        lineColor: meta.color,
        lines: [
          {
            ...meta,
            sequence: displayStopSequence(stop, networkLine.stops),
          },
        ],
      }));
  }

  const byCoord = new Map<string, MinibusLiveMapStopPin>();
  for (const networkLine of network.lines) {
    const meta = lineMeta(networkLine, catalogBySlug.get(networkLine.slug));
    for (const stop of lineMapStops(networkLine.stops)) {
      if (!hasCoordinates(stop)) {
        continue;
      }
      const key = coordDedupeKey(stop);
      if (!key) {
        continue;
      }
      const lineEntry: MinibusLiveMapStopLine = {
        ...meta,
        sequence: displayStopSequence(stop, networkLine.stops),
      };
      const existing = byCoord.get(key);
      if (existing) {
        existing.lines.push(lineEntry);
        if (stop.interchange_lines.length > existing.stop.interchange_lines.length) {
          existing.stop = stop;
        }
        continue;
      }
      byCoord.set(key, { stop, lineColor: meta.color, lines: [lineEntry] });
    }
  }

  return [...byCoord.values()];
}

export function findLiveMapStopPin(
  pins: MinibusLiveMapStopPin[],
  stopKey: string,
): MinibusLiveMapStopPin | null {
  return pins.find((pin) => pin.stop.key === stopKey) ?? null;
}

/** Highlight the network pin matching the vehicle's current stop on its line. */
export function vehicleCurrentStopKey(
  pins: MinibusLiveMapStopPin[],
  lineSlug: string | null | undefined,
  currentStopSequence: number | null | undefined,
): string | null {
  if (!lineSlug || currentStopSequence == null) {
    return null;
  }

  const pin = pins.find((row) =>
    row.lines.some((line) => line.slug === lineSlug && line.sequence === currentStopSequence),
  );
  return pin?.stop.key ?? null;
}

/** Stops for a focused vehicle: journey circulations first, else that line's network catalog. */
export function liveFocusedVehicleMapStops(
  network: MinibusNetwork | null,
  catalogLines: MinibusLine[],
  lineSlug: string,
  lineColor: string,
  journeyCirculations?: MinibusCirculation[] | null,
): MinibusLiveMapStopPin[] {
  const catalog = catalogLines.find((line) => line.slug === lineSlug);
  const lineCode = catalog?.code ?? lineSlug;
  const journeyStops = liveJourneyStopsFromCirculations(journeyCirculations);

  if (journeyStops.length > 0) {
    return journeyStops.map((stop) => ({
      stop,
      lineColor,
      lines: [{ code: lineCode, color: lineColor, slug: lineSlug, sequence: stop.sequence }],
    }));
  }

  return liveNetworkMapStops(network, catalogLines, lineSlug).map((pin) => ({
    ...pin,
    lineColor,
  }));
}
