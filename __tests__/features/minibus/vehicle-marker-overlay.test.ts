import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { vehicleMarkerOverlay } from '@/features/minibus/lib/vehicle-marker-overlay';

describe('vehicleMarkerOverlay', () => {
  it('uses a bus glyph on Android WebView overlays', () => {
    const overlay = vehicleMarkerOverlay(
      {
        id: '42',
        position: { lat: 37.74, lon: -25.67 },
      },
      '#e11d48',
      'A',
    );

    assert.ok(overlay);
    assert.equal(overlay?.iconKind, 'bus');
    assert.equal(overlay?.iconColor, '#ffffff');
    assert.equal(overlay?.label, undefined);
    assert.equal(overlay?.title, 'A');
  });
});
