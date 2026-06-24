import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  minibusRouteParam,
  pickRouteShapes,
  resolveMinibusLineDetail,
} from '@/features/minibus/resolveLineDetail';
import type { MinibusLine } from '@/lib/types';

function line(slug: string, shapes?: MinibusLine['route_shapes']): MinibusLine {
  return {
    code: slug.replace('line-', '').toUpperCase(),
    slug,
    name: slug,
    color: '#000',
    sort_order: 1,
    service_summary: {},
    route_shapes: shapes,
  };
}

describe('resolveLineDetail', () => {
  it('minibusRouteParam normalizes expo-router params', () => {
    assert.equal(minibusRouteParam('line-b'), 'line-b');
    assert.equal(minibusRouteParam(['line-b']), 'line-b');
    assert.equal(minibusRouteParam(undefined), '');
  });

  it('pickRouteShapes prefers the first non-empty encoded polyline', () => {
    const shapes = [{ direction: 0, encoded_polyline: 'abc' }];
    assert.deepEqual(pickRouteShapes([], undefined, shapes), shapes);
  });

  it('resolveMinibusLineDetail merges route_shapes from the lines list', () => {
    const shapes = [{ direction: 0, encoded_polyline: 'uxieF~tt{CLMRA' }];
    const resolved = resolveMinibusLineDetail('line-b', {
      lineQuery: line('line-b'),
      linesList: [line('line-b', shapes)],
    });

    assert.equal(resolved?.slug, 'line-b');
    assert.equal(resolved?.route_shapes?.[0]?.encoded_polyline, 'uxieF~tt{CLMRA');
  });

  it('resolveMinibusLineDetail merges route_shapes from offline bundle', () => {
    const shapes = [{ direction: 0, encoded_polyline: 'stored-shape' }];
    const resolved = resolveMinibusLineDetail('line-c', {
      offlineLines: [line('line-c', shapes)],
    });

    assert.equal(resolved?.route_shapes?.[0]?.encoded_polyline, 'stored-shape');
  });
});
