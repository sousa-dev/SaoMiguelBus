/** Filled side-view bus (Material-style) — readable on small map pins. */
const BUS_PATH =
  'M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1s1-.45 1-1v-1h8v1c0 .55.45 1 1 1s1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4S4 2.5 4 6v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-9H6V6h12v2z';

export function busMarkerSvgHtml(fillColor: string, markerSize = 28): string {
  const color = fillColor || '#ffffff';
  const iconSize = Math.max(14, Math.round(markerSize * 0.52));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" aria-hidden="true">` +
    `<path fill="${color}" d="${BUS_PATH}"/>` +
    `</svg>`
  );
}

/** Embedded into the Android Leaflet WebView script. */
export const busMarkerSvgFunctionSource = `
      function busIconSvg(fillColor, markerSize) {
        var color = fillColor || '#ffffff';
        var iconSize = Math.max(14, Math.round((markerSize || 28) * 0.52));
        return (
          '<svg xmlns="http://www.w3.org/2000/svg" width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 24 24" aria-hidden="true">' +
          '<path fill="' + color + '" d="${BUS_PATH}"/>' +
          '</svg>'
        );
      }
`.trim();
