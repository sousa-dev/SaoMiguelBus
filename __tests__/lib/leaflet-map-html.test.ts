import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

describe('leafletMapHtml', () => {
  it('does not replay overlays on options-only bridge updates', () => {
    const source = readFileSync(
      join(process.cwd(), 'lib/leaflet-map-html.ts'),
      'utf8',
    );

    assert.match(source, /if \(next\.overlays !== undefined\)/);
    assert.match(source, /updateOptions: function \(next\) \{[\s\S]*applyMapOptions\(next\);/);
    assert.doesNotMatch(source, /applyMapOptions\(config\);/);
  });
});
