import { directionsLineLabel } from '@/features/minibus/lineLabel';
import { coordinatesMatch, stopCoordinate, type MapCoordinate } from '@/features/minibus/stopCoordinates';
import type { MinibusJourney } from '@/lib/types';

export type JourneyStepKind = 'transfer' | 'board' | 'ride' | 'alight';

export type JourneyStep = {
  key: string;
  stepNumber: number;
  kind: JourneyStepKind;
  label: string;
  detail: string;
  accent?: string;
  coordinate: MapCoordinate | null;
};

export type JourneyMapMarker = {
  id: string;
  stepNumber: number;
  kind: JourneyStepKind;
  color: string;
  title: string;
  coordinate: MapCoordinate;
};

export const JOURNEY_TRANSFER_MARKER_COLOR = '#6366f1';

export function buildJourneySteps(
  journey: MinibusJourney,
  t: (key: string, opts?: Record<string, unknown>) => string,
): JourneyStep[] {
  const steps: JourneyStep[] = [];
  let stepNumber = 0;

  journey.legs.forEach((leg, legIndex) => {
    if (legIndex > 0) {
      const transfer = journey.transfer_stops[legIndex - 1];
      stepNumber += 1;
      steps.push({
        key: `transfer-${legIndex}`,
        stepNumber,
        kind: 'transfer',
        label: `${stepNumber}. ${t('minibusStepTransfer')}`,
        detail: t('minibusTransferAt', { stop: transfer?.name ?? leg.board.name }),
        coordinate: stopCoordinate(leg.board),
      });
    }

    stepNumber += 1;
    steps.push({
      key: `board-${leg.line_code}-${leg.board.key}`,
      stepNumber,
      kind: 'board',
      label: `${stepNumber}. ${t('minibusStepBoard')}`,
      detail: t('minibusStepBoardDetail', {
        stop: leg.board.name,
        line: directionsLineLabel(leg),
      }),
      accent: leg.line_color ?? undefined,
      coordinate: stopCoordinate(leg.board),
    });

    if (leg.num_stops > 2) {
      stepNumber += 1;
      steps.push({
        key: `ride-${leg.line_code}-${leg.board.key}`,
        stepNumber,
        kind: 'ride',
        label: `${stepNumber}. ${t('minibusStepRide')}`,
        detail: t('minibusStopsCount', { count: leg.num_stops - 1 }),
        accent: leg.line_color ?? undefined,
        coordinate: null,
      });
    }

    stepNumber += 1;
    steps.push({
      key: `alight-${leg.line_code}-${leg.alight.key}`,
      stepNumber,
      kind: 'alight',
      label: `${stepNumber}. ${t('minibusStepAlight')}`,
      detail: t('minibusStepAlightDetail', {
        stop: leg.alight.name,
        line: directionsLineLabel(leg),
      }),
      accent: leg.line_color ?? undefined,
      coordinate: stopCoordinate(leg.alight),
    });
  });

  return steps;
}

/** Numbered pins for board / transfer / alight — one marker per physical location. */
export function journeyMapMarkers(steps: JourneyStep[]): JourneyMapMarker[] {
  const byCoord = new Map<string, JourneyMapMarker>();

  for (const step of steps) {
    if (step.kind === 'ride' || !step.coordinate) {
      continue;
    }

    const color =
      step.kind === 'transfer'
        ? JOURNEY_TRANSFER_MARKER_COLOR
        : (step.accent ?? '#2563eb');

    const coordKey = `${step.coordinate.latitude.toFixed(5)},${step.coordinate.longitude.toFixed(5)}`;
    const candidate: JourneyMapMarker = {
      id: step.key,
      stepNumber: step.stepNumber,
      kind: step.kind,
      color,
      title: step.detail,
      coordinate: step.coordinate,
    };

    const existing = byCoord.get(coordKey);
    if (!existing || step.stepNumber >= existing.stepNumber) {
      byCoord.set(coordKey, candidate);
    }
  }

  return [...byCoord.values()].sort((a, b) => a.stepNumber - b.stepNumber);
}

export function journeyMarkerCoordinates(markers: JourneyMapMarker[]): MapCoordinate[] {
  return markers.map((marker) => marker.coordinate);
}

export function findJourneyMapMarker(
  markers: JourneyMapMarker[],
  stepKey: string,
): JourneyMapMarker | null {
  return markers.find((marker) => marker.id === stepKey) ?? null;
}

export function stepKeyMatchesMarker(stepKey: string, marker: JourneyMapMarker): boolean {
  return marker.id === stepKey;
}

export function markerAtCoordinate(
  markers: JourneyMapMarker[],
  coordinate: MapCoordinate,
): JourneyMapMarker | null {
  return markers.find((marker) => coordinatesMatch(marker.coordinate, coordinate)) ?? null;
}

export function isJourneyStepHighlighted(
  stepKey: string,
  highlightedStepKey: string | null,
  steps: JourneyStep[],
): boolean {
  if (!highlightedStepKey) {
    return false;
  }
  if (stepKey === highlightedStepKey) {
    return true;
  }
  const step = steps.find((row) => row.key === stepKey);
  const highlighted = steps.find((row) => row.key === highlightedStepKey);
  if (!step?.coordinate || !highlighted?.coordinate) {
    return false;
  }
  return coordinatesMatch(step.coordinate, highlighted.coordinate);
}

export function isJourneyMarkerHighlighted(
  marker: JourneyMapMarker,
  highlightedStepKey: string | null,
  steps: JourneyStep[],
): boolean {
  if (!highlightedStepKey) {
    return false;
  }
  if (marker.id === highlightedStepKey) {
    return true;
  }
  const highlighted = steps.find((row) => row.key === highlightedStepKey);
  if (!highlighted?.coordinate) {
    return false;
  }
  return coordinatesMatch(marker.coordinate, highlighted.coordinate);
}

export function resolveJourneyMapMarker(
  markers: JourneyMapMarker[],
  steps: JourneyStep[],
  stepKey: string,
): JourneyMapMarker | null {
  const direct = findJourneyMapMarker(markers, stepKey);
  if (direct) {
    return direct;
  }
  const step = steps.find((row) => row.key === stepKey);
  if (!step?.coordinate) {
    return null;
  }
  return markerAtCoordinate(markers, step.coordinate);
}
