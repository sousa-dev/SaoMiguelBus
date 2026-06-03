import type { TrailListFilters } from '@/features/trails/hooks/useTrailQueries';
import type { TrailSummary } from '@/lib/types';

export type DistanceRangeKey = 'all' | 'short' | 'mid' | 'long';

export const DISTANCE_RANGES: {
  key: DistanceRangeKey;
  minLength?: number;
  maxLength?: number;
}[] = [
  { key: 'all' },
  { key: 'short', maxLength: 5 },
  { key: 'mid', minLength: 5, maxLength: 10 },
  { key: 'long', minLength: 10 },
];

export function activeDistanceRange(filters: TrailListFilters): DistanceRangeKey {
  const match = DISTANCE_RANGES.find(
    (range) => range.minLength === filters.minLength && range.maxLength === filters.maxLength,
  );
  return match ? match.key : 'all';
}

export function buildTrailListFilters(partial: {
  difficulty?: string;
  shape?: string;
  minLength?: number;
  maxLength?: number;
}): TrailListFilters {
  const next: TrailListFilters = {};
  if (partial.difficulty != null) {
    next.difficulty = partial.difficulty;
  }
  if (partial.shape != null) {
    next.shape = partial.shape;
  }
  if (partial.minLength != null) {
    next.minLength = partial.minLength;
  }
  if (partial.maxLength != null) {
    next.maxLength = partial.maxLength;
  }
  return next;
}

export function countActiveTrailFilters(filters: TrailListFilters): number {
  let count = 0;
  if (filters.difficulty != null) {
    count += 1;
  }
  if (filters.shape != null) {
    count += 1;
  }
  if (filters.minLength != null || filters.maxLength != null) {
    count += 1;
  }
  return count;
}

export function hasActiveTrailFilters(filters: TrailListFilters): boolean {
  return countActiveTrailFilters(filters) > 0;
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function filterTrailsByQuery(trails: TrailSummary[], query: string): TrailSummary[] {
  const q = normalizeSearchText(query);
  if (!q) {
    return trails;
  }
  return trails.filter((trail) => normalizeSearchText(trail.name).includes(q));
}
