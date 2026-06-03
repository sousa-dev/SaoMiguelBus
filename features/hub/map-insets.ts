/** Geographic marker placement within each locator asset (normalized 0–1). */

export type MapInset = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Azores archipelago on `azores-location-map.svg` (viewBox 1304×786). */
export const AZORES_MAP_VIEWBOX = { width: 1303.9451, height: 786.1853 };

export const AZORES_MAP_INSET: MapInset = {
  x: 544 / 1303.9451,
  y: 42 / 786.1853,
  width: (1283 - 544) / 1303.9451,
  height: (730 - 42) / 786.1853,
};

/** São Miguel locator PNG (1574×978). */
export const SAO_MIGUEL_MAP_SIZE = { width: 1574, height: 978 };

export const SAO_MIGUEL_MAP_INSET: MapInset = {
  x: 0.06,
  y: 0.08,
  width: 0.88,
  height: 0.84,
};

export function projectToMapUnits(
  unitX: number,
  unitY: number,
  inset: MapInset,
): { x: number; y: number } {
  return {
    x: inset.x + unitX * inset.width,
    y: inset.y + unitY * inset.height,
  };
}
