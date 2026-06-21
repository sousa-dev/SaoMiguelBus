import type {
  MinibusJourney,
  MinibusLeg,
  MinibusNetwork,
  MinibusRouteSearchResponse,
  MinibusStopRef,
  MinibusTransferStop,
} from '@/lib/types';

/**
 * Offline mirror of the API route search (minibus/services.py). Keep the
 * algorithm — graph build, token resolution, ranking — in sync with Python.
 * Schedule-free: legs reserve departure/arrival (null) for a later schedules feature.
 */
export const MINIBUS_MAX_JOURNEYS = 3;

export function normalizeToken(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface StopNode {
  key: string;
  lineCode: string;
  lineSlug: string;
  lineName: string | null;
  lineColor: string | null;
  sequence: number;
  namePt: string;
  matchKey: string;
  interchangeKey: string;
  externalId: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Edge {
  to: string;
  isTransfer: boolean;
}

export interface MinibusGraph {
  nodes: Map<string, StopNode>;
  edges: Map<string, Edge[]>;
}

export function buildGraph(network: MinibusNetwork): MinibusGraph {
  const nodes = new Map<string, StopNode>();
  const edges = new Map<string, Edge[]>();
  const interchangeGroups = new Map<string, string[]>();

  const addEdge = (from: string, to: string, isTransfer: boolean) => {
    const list = edges.get(from) ?? [];
    list.push({ to, isTransfer });
    edges.set(from, list);
  };

  for (const line of network.lines) {
    const stops = [...line.stops].sort((a, b) => a.sequence - b.sequence);
    for (const stop of stops) {
      nodes.set(stop.key, {
        key: stop.key,
        lineCode: line.code,
        lineSlug: line.slug,
        lineName: line.name ?? null,
        lineColor: line.color ?? null,
        sequence: stop.sequence,
        namePt: stop.name_pt,
        matchKey: stop.match_key,
        interchangeKey: stop.interchange_key,
        externalId: stop.external_id ?? null,
        latitude: stop.latitude ?? null,
        longitude: stop.longitude ?? null,
      });
      const group = interchangeGroups.get(stop.interchange_key) ?? [];
      group.push(stop.key);
      interchangeGroups.set(stop.interchange_key, group);
    }
    for (let i = 0; i < stops.length - 1; i++) {
      addEdge(stops[i].key, stops[i + 1].key, false);
    }
    if (stops.length > 1) {
      addEdge(stops[stops.length - 1].key, stops[0].key, false);
    }
  }

  for (const keys of interchangeGroups.values()) {
    if (keys.length < 2) {
      continue;
    }
    for (const src of keys) {
      for (const dst of keys) {
        if (src === dst) {
          continue;
        }
        if (nodes.get(src)!.lineCode !== nodes.get(dst)!.lineCode) {
          addEdge(src, dst, true);
        }
      }
    }
  }

  return { nodes, edges };
}

export function resolveStopRefs(graph: MinibusGraph, token: string): string[] {
  const raw = token.trim().toLowerCase();
  const slug = normalizeToken(token);
  const matches: string[] = [];
  for (const [key, node] of graph.nodes) {
    if (
      key === raw ||
      node.matchKey === slug ||
      node.interchangeKey === slug ||
      normalizeToken(node.namePt) === slug
    ) {
      matches.push(key);
    }
  }
  return matches;
}

function stopRef(node: StopNode): MinibusStopRef {
  return {
    key: node.key,
    name: node.namePt,
    line_code: node.lineCode,
    sequence: node.sequence,
    external_id: node.externalId,
    latitude: node.latitude,
    longitude: node.longitude,
  };
}

function pathToJourney(graph: MinibusGraph, path: string[]): MinibusJourney {
  const legsNodes: StopNode[][] = [];
  let current: StopNode[] = [graph.nodes.get(path[0])!];
  for (let i = 1; i < path.length; i++) {
    const node = graph.nodes.get(path[i])!;
    if (node.lineCode === current[current.length - 1].lineCode) {
      current.push(node);
    } else {
      legsNodes.push(current);
      current = [node];
    }
  }
  legsNodes.push(current);

  const legs: MinibusLeg[] = [];
  const transferStops: MinibusTransferStop[] = [];
  legsNodes.forEach((stopNodes, index) => {
    legs.push({
      line_code: stopNodes[0].lineCode,
      line_slug: stopNodes[0].lineSlug,
      line_name: stopNodes[0].lineName,
      line_color: stopNodes[0].lineColor,
      board: stopRef(stopNodes[0]),
      alight: stopRef(stopNodes[stopNodes.length - 1]),
      stops: stopNodes.map(stopRef),
      num_stops: stopNodes.length,
      departure_time: null,
      arrival_time: null,
    });
    if (index > 0) {
      const prev = legsNodes[index - 1];
      transferStops.push({
        name: prev[prev.length - 1].namePt,
        from_line: prev[prev.length - 1].lineCode,
        to_line: stopNodes[0].lineCode,
      });
    }
  });

  return {
    transfers: legs.length - 1,
    total_stops: legs.reduce((sum, leg) => sum + leg.num_stops, 0),
    transfer_stops: transferStops,
    legs,
  };
}

interface QueueItem {
  transfers: number;
  stops: number;
  counter: number;
  node: string;
  path: string[];
}

/** Min-heap ordered by (transfers, stops, counter) — mirrors the Python heapq tuple. */
class MinHeap {
  private items: QueueItem[] = [];

  private less(a: QueueItem, b: QueueItem): boolean {
    if (a.transfers !== b.transfers) return a.transfers < b.transfers;
    if (a.stops !== b.stops) return a.stops < b.stops;
    return a.counter < b.counter;
  }

  get size(): number {
    return this.items.length;
  }

  push(item: QueueItem): void {
    this.items.push(item);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.less(this.items[i], this.items[parent])) {
        [this.items[i], this.items[parent]] = [this.items[parent], this.items[i]];
        i = parent;
      } else {
        break;
      }
    }
  }

  pop(): QueueItem | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0 && last) {
      this.items[0] = last;
      let i = 0;
      const n = this.items.length;
      for (;;) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let smallest = i;
        if (left < n && this.less(this.items[left], this.items[smallest])) smallest = left;
        if (right < n && this.less(this.items[right], this.items[smallest])) smallest = right;
        if (smallest === i) break;
        [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
        i = smallest;
      }
    }
    return top;
  }
}

function legSignature(journey: MinibusJourney): string {
  return journey.legs.map((leg) => `${leg.board.key}>${leg.alight.key}`).join('|');
}

export function searchRoutes(
  graph: MinibusGraph,
  originKeys: string[],
  destinationKeys: string[],
  maxResults = MINIBUS_MAX_JOURNEYS,
): MinibusJourney[] {
  if (originKeys.length === 0 || destinationKeys.length === 0) {
    return [];
  }
  const destinations = new Set(destinationKeys);
  const heap = new MinHeap();
  let counter = 0;
  for (const origin of originKeys) {
    if (destinations.has(origin)) {
      continue;
    }
    heap.push({ transfers: 0, stops: 0, counter: counter++, node: origin, path: [origin] });
  }

  const popCount = new Map<string, number>();
  const journeys: MinibusJourney[] = [];
  const seen = new Set<string>();

  while (heap.size > 0 && journeys.length < maxResults) {
    const item = heap.pop()!;
    const seenCount = popCount.get(item.node) ?? 0;
    if (seenCount >= maxResults) {
      continue;
    }
    popCount.set(item.node, seenCount + 1);

    if (destinations.has(item.node)) {
      const journey = pathToJourney(graph, item.path);
      if (journey.legs.some((leg) => leg.board.key === leg.alight.key)) {
        continue;
      }
      const signature = legSignature(journey);
      if (!seen.has(signature)) {
        seen.add(signature);
        journeys.push(journey);
      }
      continue;
    }

    for (const edge of graph.edges.get(item.node) ?? []) {
      if (item.path.includes(edge.to)) {
        continue;
      }
      heap.push({
        transfers: item.transfers + (edge.isTransfer ? 1 : 0),
        stops: item.stops + (edge.isTransfer ? 0 : 1),
        counter: counter++,
        node: edge.to,
        path: [...item.path, edge.to],
      });
    }
  }

  return journeys;
}

export interface MinibusRouteSearchLocal {
  origin: MinibusRouteSearchResponse['origin'];
  destination: MinibusRouteSearchResponse['destination'];
  journeys: MinibusJourney[];
}

export function searchMinibusJourneys(
  network: MinibusNetwork,
  origin: string,
  destination: string,
): MinibusRouteSearchLocal {
  const graph = buildGraph(network);
  const originKeys = resolveStopRefs(graph, origin);
  const destinationKeys = resolveStopRefs(graph, destination);
  const journeys = searchRoutes(graph, originKeys, destinationKeys);

  const echo = (query: string, keys: string[]): MinibusRouteSearchResponse['origin'] => ({
    query,
    name: keys.length > 0 ? graph.nodes.get(keys[0])!.namePt : null,
    matched: keys.length > 0,
  });

  return {
    origin: echo(origin, originKeys),
    destination: echo(destination, destinationKeys),
    journeys,
  };
}
