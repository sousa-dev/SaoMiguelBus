import type { TrailSummary } from '@/features/trails/types';
import type { TourSummary } from '@/lib/types';

/** Locked for the app process — new pick after cold start. */
let tourPickCode: string | null | undefined;
let trailPickId: number | null | undefined;

function pickIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

export function getSessionTourSuggestion(tours: TourSummary[]): TourSummary | null {
  if (tours.length === 0) {
    return null;
  }
  if (tourPickCode === undefined) {
    tourPickCode = tours[pickIndex(tours.length)]!.code;
  }
  const match = tours.find((t) => t.code === tourPickCode);
  if (match) {
    return match;
  }
  tourPickCode = tours[pickIndex(tours.length)]!.code;
  return tours.find((t) => t.code === tourPickCode) ?? tours[0]!;
}

export function getSessionTrailSuggestion(trails: TrailSummary[]): TrailSummary | null {
  if (trails.length === 0) {
    return null;
  }
  if (trailPickId === undefined) {
    trailPickId = trails[pickIndex(trails.length)]!.id;
  }
  const match = trails.find((t) => t.id === trailPickId);
  if (match) {
    return match;
  }
  trailPickId = trails[pickIndex(trails.length)]!.id;
  return trails.find((t) => t.id === trailPickId) ?? trails[0]!;
}
