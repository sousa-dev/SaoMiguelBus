import type { TrailListFilters } from '@/features/trails/hooks/useTrailQueries';

export function parseLength(text: string): number | undefined {
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }
  const value = parseFloat(trimmed);
  if (Number.isNaN(value)) {
    return undefined;
  }
  return value;
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
