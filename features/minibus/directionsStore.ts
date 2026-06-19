import type { MinibusJourney, MinibusLine } from '@/lib/types';

type PendingDirections = {
  journey: MinibusJourney;
  linesByCode: Map<string, MinibusLine>;
};

let pending: PendingDirections | null = null;

export function setPendingDirections(journey: MinibusJourney, linesByCode: Map<string, MinibusLine>): void {
  pending = { journey, linesByCode };
}

export function consumePendingDirections(): PendingDirections | null {
  const value = pending;
  pending = null;
  return value;
}
