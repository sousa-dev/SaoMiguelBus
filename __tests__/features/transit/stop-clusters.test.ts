/**
 * Network-map thinning.
 *
 * 816 stops is past what the Android Leaflet WebView draws smoothly — every pin
 * is a DOM node — and at island zoom they are an unreadable blob regardless.
 * These pin the two rules that keep it usable AND stable while panning.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CLUSTER_ABOVE_DELTA,
  MAX_PINS,
  clusterStops,
  stopsInRegion,
} from '@/features/transit/lib/stop-clusters';
import type { Stop } from '@/lib/types';

const ISLAND = { latitude: 37.79, longitude: -25.5, latitudeDelta: 0.25, longitudeDelta: 0.75 };
const CLOSE = { latitude: 37.74, longitude: -25.67, latitudeDelta: 0.02, longitudeDelta: 0.02 };

function grid(count: number, lat = 37.74, lon = -25.67, spread = 0.01): Stop[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `STOP ${i + 1}`,
    latitude: lat + (i % 20) * spread * 0.1,
    longitude: lon + Math.floor(i / 20) * spread * 0.1,
  }));
}

describe('stopsInRegion', () => {
  it('keeps what is on screen and drops what is not', () => {
    const stops: Stop[] = [
      { id: 1, name: 'IN', latitude: 37.74, longitude: -25.67 },
      { id: 2, name: 'FAR', latitude: 37.90, longitude: -25.15 },
    ];

    assert.deepEqual(stopsInRegion(stops, CLOSE).map((s) => s.name), ['IN']);
  });

  it('keeps a margin so pins do not pop in at the edge while panning', () => {
    const justOutside: Stop = {
      id: 1, name: 'EDGE',
      latitude: CLOSE.latitude + CLOSE.latitudeDelta / 2 + 0.001,
      longitude: CLOSE.longitude,
    };

    assert.equal(stopsInRegion([justOutside], CLOSE).length, 1);
  });
});

describe('clusterStops', () => {
  it('shows individual stops when zoomed in', () => {
    const clusters = clusterStops(grid(30), CLOSE);

    assert.ok(clusters.every((c) => c.count === 1));
    assert.ok(clusters.every((c) => c.stop !== undefined));
  });

  it('clusters at island zoom rather than drawing a blob', () => {
    const clusters = clusterStops(grid(400), ISLAND);

    assert.ok(clusters.length < 400);
    assert.ok(clusters.some((c) => c.count > 1));
  });

  it('a cluster carries a count and no single stop', () => {
    const merged = clusterStops(grid(400), ISLAND).find((c) => c.count > 1);

    assert.ok(merged);
    assert.equal(merged!.stop, undefined);
    assert.ok(merged!.count > 1);
  });

  it('never exceeds the pin ceiling', () => {
    const clusters = clusterStops(grid(3000, 37.7, -25.8, 0.5), ISLAND);

    assert.ok(clusters.length <= MAX_PINS, `${clusters.length} pins`);
  });

  it('clusters even when zoomed in if the crowd is still too big', () => {
    const dense = grid(MAX_PINS + 200, 37.74, -25.67, 0.001);
    const clusters = clusterStops(dense, CLOSE);

    assert.ok(clusters.length <= MAX_PINS);
  });

  it('is deterministic — the same region twice gives the same pins in order', () => {
    const stops = grid(400);
    const a = clusterStops(stops, ISLAND).map((c) => c.id);
    const b = clusterStops(stops, ISLAND).map((c) => c.id);

    assert.deepEqual(a, b);
  });

  it('is stable under panning: a shared cell keeps its identity', () => {
    // Grid clustering, not distance clustering, precisely so this holds — a
    // distance-based grouping re-forms as new points enter and pins jump.
    const stops = grid(400);
    const panned = { ...ISLAND, longitude: ISLAND.longitude + 0.0001 };

    const before = new Set(clusterStops(stops, ISLAND).map((c) => c.id));
    const after = clusterStops(stops, panned).map((c) => c.id);

    assert.ok(after.filter((id) => before.has(id)).length > after.length / 2);
  });

  it('places a cluster among the stops it stands for', () => {
    const stops = grid(400);
    const cluster = clusterStops(stops, ISLAND).find((c) => c.count > 1)!;

    const lats = stops.map((s) => s.latitude);
    assert.ok(cluster.latitude >= Math.min(...lats));
    assert.ok(cluster.latitude <= Math.max(...lats));
  });

  it('returns nothing for an empty network rather than throwing', () => {
    assert.deepEqual(clusterStops([], ISLAND), []);
  });

  it('treats the documented delta as the clustering boundary', () => {
    const stops = grid(30);
    const zoomedIn = { ...CLOSE, latitudeDelta: CLUSTER_ABOVE_DELTA, longitudeDelta: CLUSTER_ABOVE_DELTA };

    assert.ok(clusterStops(stops, zoomedIn).every((c) => c.count === 1));
  });
});
