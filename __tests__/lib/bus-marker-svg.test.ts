import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { busMarkerSvgFunctionSource, busMarkerSvgHtml } from '@/lib/bus-marker-svg';

describe('busMarkerSvgHtml', () => {
  it('renders a filled side-view bus silhouette', () => {
    const svg = busMarkerSvgHtml('#ffffff', 28);

    assert.match(svg, /<path fill="#ffffff"/);
    assert.match(svg, /viewBox="0 0 24 24"/);
    assert.doesNotMatch(svg, /stroke-width/);
  });

  it('embeds the same filled bus helper in the Leaflet WebView script', () => {
    assert.match(busMarkerSvgFunctionSource, /function busIconSvg/);
    assert.match(busMarkerSvgFunctionSource, /<path fill="' \+ color \+ '" d="/);
  });
});
