import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  fitRegionForCoordinates,
  journeyPolylines,
  linePolyline,
} from '@/features/minibus/stopCoordinates';
import type { MinibusJourney, MinibusNetworkStop } from '@/lib/types';

function geoStop(sequence: number, key: string, lat: number, lng: number): MinibusNetworkStop {
  return {
    sequence,
    key,
    name_pt: key,
    match_key: key,
    interchange_key: key,
    interchange_lines: [],
    latitude: lat,
    longitude: lng,
  };
}

describe('stopCoordinates', () => {
  it('linePolyline returns ordered coordinates', () => {
    const stops = [
      geoStop(2, 'a-02', 37.74, -25.68),
      geoStop(1, 'a-01', 37.73, -25.67),
    ];
    const coords = linePolyline(stops);
    assert.equal(coords.length, 2);
    assert.equal(coords[0]?.latitude, 37.73);
    assert.equal(coords[1]?.latitude, 37.74);
  });

  it('linePolyline skips stops missing coordinates', () => {
    const stops = [
      geoStop(1, 'a-01', 37.73, -25.67),
      { ...geoStop(2, 'a-02', 0, 0), latitude: null, longitude: null },
    ];
    const coords = linePolyline(stops);
    assert.equal(coords.length, 1);
  });

  it('journeyPolylines returns one polyline per leg', () => {
    const journey: MinibusJourney = {
      transfers: 1,
      total_stops: 4,
      transfer_stops: [{ name: 'Transfer', from_line: 'A', to_line: 'D' }],
      legs: [
        {
          line_code: 'A',
          line_slug: 'line-a',
          line_name: 'A',
          line_color: '#fbc707',
          board: { key: 'a-01', name: 'Start', line_code: 'A', sequence: 1, latitude: 37.73, longitude: -25.67 },
          alight: { key: 'a-02', name: 'Mid', line_code: 'A', sequence: 2, latitude: 37.74, longitude: -25.68 },
          stops: [
            { key: 'a-01', name: 'Start', line_code: 'A', sequence: 1, latitude: 37.73, longitude: -25.67 },
            { key: 'a-02', name: 'Mid', line_code: 'A', sequence: 2, latitude: 37.74, longitude: -25.68 },
          ],
          num_stops: 2,
          departure_time: null,
          arrival_time: null,
        },
        {
          line_code: 'D',
          line_slug: 'line-d',
          line_name: 'D',
          line_color: '#e30613',
          board: { key: 'd-01', name: 'Board', line_code: 'D', sequence: 1, latitude: 37.75, longitude: -25.69 },
          alight: { key: 'd-02', name: 'End', line_code: 'D', sequence: 2, latitude: 37.76, longitude: -25.7 },
          stops: [
            { key: 'd-01', name: 'Board', line_code: 'D', sequence: 1, latitude: 37.75, longitude: -25.69 },
            { key: 'd-02', name: 'End', line_code: 'D', sequence: 2, latitude: 37.76, longitude: -25.7 },
          ],
          num_stops: 2,
          departure_time: null,
          arrival_time: null,
        },
      ],
    };

    const polylines = journeyPolylines(journey);
    assert.equal(polylines.length, 2);
    assert.equal(polylines[0]?.color, '#fbc707');
    assert.equal(polylines[1]?.color, '#e30613');
  });

  it('fitRegionForCoordinates returns padded region', () => {
    const region = fitRegionForCoordinates([
      { latitude: 37.73, longitude: -25.67 },
      { latitude: 37.76, longitude: -25.7 },
    ]);
    assert.ok(region.latitudeDelta >= 0.015);
    assert.ok(region.longitudeDelta >= 0.015);
  });
});
