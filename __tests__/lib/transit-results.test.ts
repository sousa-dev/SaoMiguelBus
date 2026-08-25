import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { processTransitResults } from '@/lib/transit-results';
import type { TransitSearchResult } from '@/lib/types';

const ctx = {
  origin: 'Ponta Delgada',
  destination: 'Pico do Fogo',
};

function makeTrip(
  id: number,
  start: string,
  end: string,
  likesPercent: number,
  extraStops?: { before?: string; after?: string },
): TransitSearchResult {
  const stops = [
    ...(extraStops?.before
      ? [{ name: 'Terminal', time: extraStops.before }]
      : []),
    { name: 'Ponta Delgada', time: start },
    { name: 'Pico do Fogo', time: end },
    ...(extraStops?.after ? [{ name: 'Terminal End', time: extraStops.after }] : []),
  ];
  return {
    id,
    route: likesPercent < 60 ? 'C104' : '104',
    origin: ctx.origin,
    destination: ctx.destination,
    start: stops[0].time,
    end: stops[stops.length - 1].time,
    likesPercent,
    dislikesPercent: 0,
    information: {},
    stops,
  };
}

describe('processTransitResults', () => {
  it('puts upcoming departures first, earlier trips below', () => {
    const results = processTransitResults(
      [makeTrip(1, '07h25', '07h45', 0), makeTrip(2, '15h10', '15h30', 80)],
      { ...ctx, userTime: '14:00' },
    );
    assert.equal(results.length, 2);
    assert.equal(results[0]?.start, '15h10');
    assert.equal(results[1]?.start, '07h25');
  });

  it('sorts ascending within each partition at midnight', () => {
    const results = processTransitResults(
      [makeTrip(2, '15h10', '15h30', 80), makeTrip(1, '07h25', '07h45', 0)],
      { ...ctx, userTime: '00:00' },
    );
    assert.equal(results[0]?.start, '07h25');
    assert.equal(results[1]?.start, '15h10');
  });

  it('dedups near departures preferring higher-confidence trips', () => {
    const results = processTransitResults(
      [
        makeTrip(1, '07h25', '07h45', 0),
        makeTrip(2, '07h26', '07h46', 80),
      ],
      { ...ctx, userTime: '00:00' },
    );
    assert.equal(results.length, 1);
    assert.equal(results[0]?.likesPercent, 80);
  });

  it('keeps confirmation trips visible', () => {
    const results = processTransitResults(
      [makeTrip(770, '07h25', '07h45', 0)],
      { ...ctx, userTime: '20:00' },
    );
    assert.equal(results.length, 1);
    assert.equal(results[0]?.route, 'C104');
    assert.equal(results[0]?.start, '07h25');
  });

  it('trims segment times for partial routes', () => {
    const trip: TransitSearchResult = {
      id: 3,
      route: '104',
      origin: 'Ponta Delgada',
      destination: 'Ribeira Grande',
      start: '06h00',
      end: '08h30',
      likesPercent: 80,
      dislikesPercent: 0,
      information: {},
      stops: [
        { name: 'Terminal Norte', time: '06h00' },
        { name: 'Ponta Delgada', time: '06h45' },
        { name: 'Ribeira Grande', time: '07h55' },
        { name: 'Norte', time: '08h30' },
      ],
    };
    const results = processTransitResults([trip], {
      origin: 'Ponta Delgada',
      destination: 'Ribeira Grande',
      userTime: '00:00',
    });
    assert.equal(results.length, 1);
    assert.equal(results[0]?.start, '06h45');
    assert.equal(results[0]?.end, '07h55');
    assert.equal(results[0]?.stops.length, 2);
  });
});
