import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  minibusJourneyAnalyticsProps,
  minibusJourneyEndpoints,
  minibusJourneyLineCodes,
} from '@/features/minibus/lib/analytics-props';
import type { MinibusJourney } from '@/lib/types';

const directJourney: MinibusJourney = {
  transfers: 0,
  total_stops: 4,
  transfer_stops: [],
  legs: [
    {
      line_code: 'A',
      line_slug: 'line-a',
      line_name: 'Line A',
      line_color: '#f00',
      board: { key: 'a-1', name: 'Origin Stop', line_code: 'A', sequence: 1 },
      alight: { key: 'a-4', name: 'Destination Stop', line_code: 'A', sequence: 4 },
      stops: [],
      num_stops: 4,
      departure_time: null,
      arrival_time: null,
    },
  ],
};

const transferJourney: MinibusJourney = {
  transfers: 1,
  total_stops: 8,
  transfer_stops: [{ name: 'Interchange', from_line: 'A', to_line: 'B' }],
  legs: [
    {
      line_code: 'A',
      line_slug: 'line-a',
      line_name: 'Line A',
      line_color: '#f00',
      board: { key: 'a-1', name: 'Start', line_code: 'A', sequence: 1 },
      alight: { key: 'a-3', name: 'Interchange', line_code: 'A', sequence: 3 },
      stops: [],
      num_stops: 3,
      departure_time: null,
      arrival_time: null,
    },
    {
      line_code: 'B',
      line_slug: 'line-b',
      line_name: 'Line B',
      line_color: '#0f0',
      board: { key: 'b-1', name: 'Interchange', line_code: 'B', sequence: 1 },
      alight: { key: 'b-5', name: 'End', line_code: 'B', sequence: 5 },
      stops: [],
      num_stops: 5,
      departure_time: null,
      arrival_time: null,
    },
  ],
};

describe('minibus analytics props', () => {
  it('extracts endpoints from single-leg journeys', () => {
    assert.deepEqual(minibusJourneyEndpoints(directJourney), {
      origin: 'Origin Stop',
      destination: 'Destination Stop',
    });
  });

  it('extracts endpoints from multi-leg journeys', () => {
    assert.deepEqual(minibusJourneyEndpoints(transferJourney), {
      origin: 'Start',
      destination: 'End',
    });
  });

  it('joins line codes in leg order', () => {
    assert.equal(minibusJourneyLineCodes(transferJourney), 'A,B');
  });

  it('builds analytics props with extras', () => {
    const props = minibusJourneyAnalyticsProps(directJourney, { journey_index: 0, offline: true });
    assert.equal(props.origin, 'Origin Stop');
    assert.equal(props.destination, 'Destination Stop');
    assert.equal(props.line_codes, 'A');
    assert.equal(props.journey_index, 0);
    assert.equal(props.offline, true);
  });
});
