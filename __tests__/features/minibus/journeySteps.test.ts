import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildJourneySteps,
  isJourneyStepHighlighted,
  journeyMapMarkers,
  resolveJourneyMapMarker,
} from '@/features/minibus/journeySteps';
import type { MinibusJourney } from '@/lib/types';

const t = (key: string, opts?: Record<string, unknown>) => {
  if (key === 'minibusStopsCount') {
    return `${opts?.count} stops`;
  }
  return `${key}:${JSON.stringify(opts ?? {})}`;
};

const journey: MinibusJourney = {
  transfers: 1,
  total_stops: 5,
  transfer_stops: [{ name: 'Gamma', from_line: 'D', to_line: 'C' }],
  legs: [
    {
      line_code: 'D',
      line_slug: 'line-d',
      line_name: 'Linha D — Laranja',
      line_color: '#f07d00',
      board: { key: 'd-09', name: 'Start', line_code: 'D', sequence: 9, latitude: 37.74, longitude: -25.68 },
      alight: { key: 'd-18', name: 'Gamma', line_code: 'D', sequence: 18, latitude: 37.75, longitude: -25.66 },
      stops: [
        { key: 'd-09', name: 'Start', line_code: 'D', sequence: 9, latitude: 37.74, longitude: -25.68 },
        { key: 'd-18', name: 'Gamma', line_code: 'D', sequence: 18, latitude: 37.75, longitude: -25.66 },
      ],
      num_stops: 2,
      departure_time: null,
      arrival_time: null,
    },
    {
      line_code: 'C',
      line_slug: 'line-c',
      line_name: 'Linha C — Azul',
      line_color: '#00aeef',
      board: { key: 'c-13', name: 'Gamma', line_code: 'C', sequence: 13, latitude: 37.75, longitude: -25.66 },
      alight: { key: 'c-15', name: 'End', line_code: 'C', sequence: 15, latitude: 37.76, longitude: -25.65 },
      stops: [
        { key: 'c-13', name: 'Gamma', line_code: 'C', sequence: 13, latitude: 37.75, longitude: -25.66 },
        { key: 'c-15', name: 'End', line_code: 'C', sequence: 15, latitude: 37.76, longitude: -25.65 },
      ],
      num_stops: 2,
      departure_time: null,
      arrival_time: null,
    },
  ],
};

describe('journeySteps', () => {
  it('builds numbered steps with board, alight, and transfer', () => {
    const steps = buildJourneySteps(journey, t);
    assert.equal(steps.length, 5);
    assert.equal(steps[0]?.kind, 'board');
    assert.equal(steps[0]?.stepNumber, 1);
    assert.equal(steps[1]?.kind, 'alight');
    assert.equal(steps[2]?.kind, 'transfer');
    assert.equal(steps[3]?.kind, 'board');
  });

  it('dedupes co-located transfer and board into one map marker', () => {
    const steps = buildJourneySteps(journey, t);
    const markers = journeyMapMarkers(steps);
    assert.equal(markers.length, 3);
    const gammaMarker = markers.find((marker) => marker.stepNumber === 4);
    assert.equal(gammaMarker?.kind, 'board');
  });

  it('highlights co-located transfer and board steps together', () => {
    const steps = buildJourneySteps(journey, t);
    assert.ok(isJourneyStepHighlighted('transfer-1', 'board-C-c-13', steps));
    const marker = resolveJourneyMapMarker(journeyMapMarkers(steps), steps, 'transfer-1');
    assert.equal(marker?.stepNumber, 4);
  });
});
