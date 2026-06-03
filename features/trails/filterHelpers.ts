import type { TrailListFilters } from '@/features/trails/hooks/useTrailQueries';

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

export function hasActiveTrailFilters(filters: TrailListFilters): boolean {
  return (
    filters.difficulty != null ||
    filters.shape != null ||
    filters.minLength != null ||
    filters.maxLength != null
  );
}
