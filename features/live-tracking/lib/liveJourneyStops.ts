import { stopDisplayNameFromCirculations } from '@/features/live-tracking/lib/liveEtas';
import type { LiveCirculation, LiveMapStop } from '@/features/live-tracking/types';

/** Map vehicle journey circulations to network-style stops for map markers. */
export function liveJourneyStopsFromCirculations(
  circulations: LiveCirculation[] | null | undefined,
): LiveMapStop[] {
  if (!circulations?.length) {
    return [];
  }

  const seen = new Set<string>();
  const stops: LiveMapStop[] = [];

  for (const row of [...circulations].sort((a, b) => a.sequence - b.sequence)) {
    const position = row.stage?.position;
    if (
      !position ||
      typeof position.lat !== 'number' ||
      typeof position.lon !== 'number'
    ) {
      continue;
    }

    const stageId = row.stage?.id?.trim();
    const dedupeKey =
      stageId || `${position.lat.toFixed(5)},${position.lon.toFixed(5)}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    const name =
      stopDisplayNameFromCirculations(circulations, row.sequence) ??
      `Stop ${row.sequence}`;

    stops.push({
      key: `live-${dedupeKey}`,
      sequence: row.sequence,
      name_pt: name,
      match_key: dedupeKey,
      interchange_key: '',
      interchange_lines: [],
      latitude: position.lat,
      longitude: position.lon,
    });
  }

  return stops;
}
