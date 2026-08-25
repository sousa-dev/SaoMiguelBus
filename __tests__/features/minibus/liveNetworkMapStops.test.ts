import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  liveFocusedVehicleMapStops,
  liveNetworkMapStops,
  vehicleCurrentStopKey,
} from '@/features/minibus/lib/liveNetworkMapStops';
import type { MinibusLine, MinibusNetwork } from '@/lib/types';

const catalogLines: MinibusLine[] = [
  {
    code: 'A',
    slug: 'linha-a',
    name: 'Linha A',
    color: '#ff0000',
    sort_order: 1,
    service_summary: {},
  },
];

const network: MinibusNetwork = {
  interchanges_by_key: {},
  lines: [
    {
      code: 'A',
      slug: 'linha-a',
      name: 'Linha A',
      color: '#ff0000',
      direction: 'Circular',
      stop_count: 3,
      stops: [
        {
          key: 'a-1',
          sequence: 1,
          name_pt: 'Terminal',
          match_key: 'terminal',
          interchange_key: '',
          interchange_lines: [],
          latitude: 37.74,
          longitude: -25.67,
        },
        {
          key: 'a-2',
          sequence: 2,
          name_pt: 'Centro',
          match_key: 'centro',
          interchange_key: '',
          interchange_lines: ['B'],
          latitude: 37.741,
          longitude: -25.671,
        },
        {
          key: 'a-3',
          sequence: 3,
          name_pt: 'Terminal',
          match_key: 'terminal-loop',
          interchange_key: '',
          interchange_lines: [],
          latitude: 37.74,
          longitude: -25.67,
        },
      ],
    },
  ],
};

describe('liveNetworkMapStops', () => {
  it('returns line stops when filtered by slug', () => {
    const pins = liveNetworkMapStops(network, catalogLines, 'linha-a');
    assert.equal(pins.length, 2);
    assert.equal(pins[0].stop.key, 'a-1');
    assert.equal(pins[0].lineColor, '#ff0000');
    assert.equal(pins[0].lines[0].sequence, 1);
  });

  it('dedupes loop terminus stops', () => {
    const pins = liveNetworkMapStops(network, catalogLines, 'linha-a');
    assert.equal(pins[pins.length - 1].stop.key, 'a-2');
  });

  it('resolves vehicle current stop key on the filtered line', () => {
    const pins = liveNetworkMapStops(network, catalogLines, 'linha-a');
    assert.equal(vehicleCurrentStopKey(pins, 'linha-a', 2), 'a-2');
  });

  it('prefers journey circulations for focused vehicle stops', () => {
    const pins = liveFocusedVehicleMapStops(network, catalogLines, 'linha-a', '#ff0000', [
      {
        sequence: 5,
        stage: {
          id: 'x',
          name: 'Test Stop',
          position: { lat: 37.75, lon: -25.68 },
        },
      },
    ]);
    assert.equal(pins.length, 1);
    assert.equal(pins[0].stop.name_pt, 'Test Stop');
    assert.equal(pins[0].lines[0].slug, 'linha-a');
  });
});
