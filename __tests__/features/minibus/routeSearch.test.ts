import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildGraph,
  normalizeToken,
  resolveStopRefs,
  searchMinibusJourneys,
  searchRoutes,
} from '@/features/minibus/routeSearch';
import type { MinibusNetwork, MinibusNetworkStop } from '@/lib/types';

function stop(
  sequence: number,
  key: string,
  name: string,
  interchangeKey: string,
): MinibusNetworkStop {
  return {
    sequence,
    key,
    name_pt: name,
    match_key: normalizeToken(name),
    interchange_key: interchangeKey,
    interchange_lines: [],
  };
}

// Two circular lines (A, D) sharing the "gamma" interchange at a-03 / d-02.
const NETWORK: MinibusNetwork = {
  interchanges_by_key: { gamma: ['A', 'D'] },
  lines: [
    {
      code: 'A',
      slug: 'line-a',
      name: 'Linha A',
      color: '#fbc707',
      direction: 'circular',
      stop_count: 4,
      stops: [
        stop(1, 'a-01', 'Alpha', 'alpha'),
        stop(2, 'a-02', 'Beta', 'beta'),
        stop(3, 'a-03', 'Gamma', 'gamma'),
        stop(4, 'a-04', 'Delta', 'delta'),
      ],
    },
    {
      code: 'D',
      slug: 'line-d',
      name: 'Linha D',
      color: '#f07d00',
      direction: 'circular',
      stop_count: 3,
      stops: [
        stop(1, 'd-01', 'Epsilon', 'epsilon'),
        stop(2, 'd-02', 'Gamma', 'gamma'),
        stop(3, 'd-03', 'Zeta', 'zeta'),
      ],
    },
  ],
};

describe('normalizeToken', () => {
  it('strips accents and punctuation like the API', () => {
    assert.equal(normalizeToken('Praça Vasco da Gama'), 'praca-vasco-da-gama');
    assert.equal(normalizeToken('Rua Santa Clara (1.ª)'), 'rua-santa-clara-1-a');
  });
});

describe('buildGraph', () => {
  it('creates a node per stop and a circular wrap edge', () => {
    const graph = buildGraph(NETWORK);
    assert.equal(graph.nodes.size, 7);
    const wraps = (graph.edges.get('a-04') ?? []).filter((e) => !e.isTransfer).map((e) => e.to);
    assert.ok(wraps.includes('a-01'));
  });

  it('connects shared interchange across lines with transfer edges', () => {
    const graph = buildGraph(NETWORK);
    const transfers = (graph.edges.get('a-03') ?? []).filter((e) => e.isTransfer).map((e) => e.to);
    assert.deepEqual(transfers, ['d-02']);
  });
});

describe('resolveStopRefs', () => {
  it('resolves by key, name, and interchange across lines', () => {
    const graph = buildGraph(NETWORK);
    assert.deepEqual(resolveStopRefs(graph, 'a-01'), ['a-01']);
    assert.deepEqual(resolveStopRefs(graph, 'Gamma').sort(), ['a-03', 'd-02']);
  });
});

describe('searchRoutes', () => {
  it('returns a direct journey with no transfers', () => {
    const graph = buildGraph(NETWORK);
    const [best] = searchRoutes(graph, ['a-01'], ['a-04']);
    assert.equal(best.transfers, 0);
    assert.equal(best.legs.length, 1);
    assert.equal(best.legs[0].line_code, 'A');
    assert.equal(best.legs[0].board.key, 'a-01');
    assert.equal(best.legs[0].alight.key, 'a-04');
    assert.equal(best.legs[0].departure_time, null);
    assert.equal(best.legs[0].arrival_time, null);
  });

  it('returns a one-transfer cross-line journey via the shared interchange', () => {
    const graph = buildGraph(NETWORK);
    const [best] = searchRoutes(graph, ['a-01'], ['d-03']);
    assert.equal(best.transfers, 1);
    assert.equal(best.legs.length, 2);
    assert.equal(best.legs[0].line_code, 'A');
    assert.equal(best.legs[1].line_code, 'D');
    assert.equal(best.legs[1].alight.key, 'd-03');
    assert.equal(best.transfer_stops.length, 1);
    assert.equal(best.transfer_stops[0].name, 'Gamma');
    assert.equal(best.transfer_stops[0].from_line, 'A');
    assert.equal(best.transfer_stops[0].to_line, 'D');
  });

  it('ranks results by transfers ascending and caps the count', () => {
    const graph = buildGraph(NETWORK);
    const journeys = searchRoutes(graph, ['a-01'], ['d-03'], 3);
    assert.ok(journeys.length <= 3);
    const transfers = journeys.map((j) => j.transfers);
    assert.deepEqual(transfers, [...transfers].sort((a, b) => a - b));
  });

  it('returns nothing when an endpoint is unresolved', () => {
    const graph = buildGraph(NETWORK);
    assert.deepEqual(searchRoutes(graph, [], ['a-04']), []);
  });
});

describe('searchMinibusJourneys', () => {
  it('echoes matched endpoints and enriches legs with line metadata', () => {
    const result = searchMinibusJourneys(NETWORK, 'a-01', 'd-03');
    assert.equal(result.origin.matched, true);
    assert.equal(result.origin.name, 'Alpha');
    assert.equal(result.destination.matched, true);
    assert.ok(result.journeys.length >= 1);
    assert.equal(result.journeys[0].legs[0].line_name, 'Linha A');
    assert.equal(result.journeys[0].legs[0].line_color, '#fbc707');
  });

  it('reports unmatched endpoints with no journeys', () => {
    const result = searchMinibusJourneys(NETWORK, 'nowhere', 'd-03');
    assert.equal(result.origin.matched, false);
    assert.deepEqual(result.journeys, []);
  });
});
