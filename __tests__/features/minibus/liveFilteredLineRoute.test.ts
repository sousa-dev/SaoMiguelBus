import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { liveFilteredLineRoutePolyline } from '@/features/minibus/lib/liveFilteredLineRoute';
import type { MinibusLine, MinibusNetwork } from '@/lib/types';

function catalogLine(slug: string, shapes?: MinibusLine['route_shapes']): MinibusLine {
  return {
    code: slug.replace('line-', '').toUpperCase(),
    slug,
    name: slug,
    color: '#2563eb',
    sort_order: 1,
    service_summary: {},
    route_shapes: shapes,
  };
}

const network: MinibusNetwork = {
  lines: [
    {
      slug: 'line-a',
      code: 'A',
      color: '#e11d48',
      stops: [
        {
          key: 'a-1',
          name_pt: 'Stop 1',
          sequence: 1,
          latitude: 37.74,
          longitude: -25.67,
          interchange_lines: [],
        },
        {
          key: 'a-2',
          name_pt: 'Stop 2',
          sequence: 2,
          latitude: 37.75,
          longitude: -25.66,
          interchange_lines: [],
        },
      ],
    },
  ],
};

describe('liveFilteredLineRoutePolyline', () => {
  it('returns stop-to-stop geometry when no stored route shape exists', () => {
    const route = liveFilteredLineRoutePolyline(network, 'line-a', {
      linesList: [catalogLine('line-a')],
    });

    assert.equal(route?.length, 2);
    assert.deepEqual(route?.[0], { latitude: 37.74, longitude: -25.67 });
  });

  it('prefers stored AVL route shapes for the filtered line', () => {
    const route = liveFilteredLineRoutePolyline(network, 'line-a', {
      linesList: [
        catalogLine('line-a', [
          {
            direction: 0,
            encoded_polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
          },
        ]),
      ],
    });

    assert.ok(route && route.length > 2);
  });

  it('returns undefined when no line is selected', () => {
    assert.equal(
      liveFilteredLineRoutePolyline(network, null, { linesList: [catalogLine('line-a')] }),
      undefined,
    );
  });
});
