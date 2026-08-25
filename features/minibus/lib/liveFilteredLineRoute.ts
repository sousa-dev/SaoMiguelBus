import { resolveMinibusLineDetail } from '@/features/minibus/resolveLineDetail';
import { lineRoutePolyline, type MapCoordinate } from '@/features/minibus/stopCoordinates';
import type { MinibusLine, MinibusNetwork } from '@/lib/types';

export type LiveFilteredLineRouteSources = {
  lineQuery?: MinibusLine | null;
  linesList?: MinibusLine[] | null;
  offlineLines?: MinibusLine[] | null;
};

export function liveFilteredLineRoutePolyline(
  network: MinibusNetwork | null,
  selectedLineSlug: string | null,
  sources: LiveFilteredLineRouteSources,
): MapCoordinate[] | undefined {
  if (!selectedLineSlug || !network) {
    return undefined;
  }

  const networkLine = network.lines.find((line) => line.slug === selectedLineSlug);
  if (!networkLine) {
    return undefined;
  }

  const catalogLine = resolveMinibusLineDetail(selectedLineSlug, sources);
  const coordinates = lineRoutePolyline(networkLine.stops, catalogLine?.route_shapes);
  return coordinates.length > 1 ? coordinates : undefined;
}

export function liveFilteredLineColor(
  selectedLineSlug: string | null,
  sources: LiveFilteredLineRouteSources,
): string | null {
  if (!selectedLineSlug) {
    return null;
  }
  return resolveMinibusLineDetail(selectedLineSlug, sources)?.color ?? null;
}
