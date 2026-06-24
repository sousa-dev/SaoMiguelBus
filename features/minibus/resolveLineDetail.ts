import type { MinibusLine, MinibusRouteShape } from '@/lib/types';

export function minibusRouteParam(value: string | string[] | undefined): string {
  if (value == null) {
    return '';
  }
  return typeof value === 'string' ? value : (value[0] ?? '');
}

export function pickRouteShapes(
  ...candidates: (MinibusRouteShape[] | null | undefined)[]
): MinibusRouteShape[] | undefined {
  for (const shapes of candidates) {
    const encoded = shapes?.find((shape) => typeof shape.encoded_polyline === 'string' && shape.encoded_polyline.length > 0);
    if (encoded) {
      return shapes;
    }
  }
  return undefined;
}

/** Merge line metadata + route_shapes from line detail, lines list, or offline bundle. */
export function resolveMinibusLineDetail(
  slug: string,
  sources: {
    lineQuery?: MinibusLine | null;
    linesList?: MinibusLine[] | null;
    offlineLines?: MinibusLine[] | null;
  },
): MinibusLine | null {
  const listLine = sources.linesList?.find((row) => row.slug === slug) ?? null;
  const offlineLine = sources.offlineLines?.find((row) => row.slug === slug) ?? null;
  const base = sources.lineQuery ?? listLine ?? offlineLine;
  if (!base) {
    return null;
  }

  const route_shapes = pickRouteShapes(
    sources.lineQuery?.route_shapes,
    base.route_shapes,
    listLine?.route_shapes,
    offlineLine?.route_shapes,
  );

  if (route_shapes && !base.route_shapes?.length) {
    return { ...base, route_shapes };
  }

  return base;
}
