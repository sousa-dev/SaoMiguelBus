import type { MinibusCirculation } from '@/lib/types';

export type MinibusLiveEtaRow = {
  sequence: number;
  stopName: string;
  /** Upstream stop code (e.g. B 12) when it differs from the display name. */
  stopCode: string | null;
  etaLabel: string;
  isCurrent: boolean;
};

function titleCasePlaceName(value: string): string {
  const prepositions = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
  return value
    .toLocaleLowerCase('pt')
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      if (index > 0 && prepositions.has(word)) {
        return word;
      }
      if (word.startsWith('(') && word.length > 1) {
        return `(${word.charAt(1).toUpperCase()}${word.slice(2)}`;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function circulationStopLabels(stage: MinibusCirculation['stage'], sequence: number): {
  stopName: string;
  stopCode: string | null;
} {
  const name = stage?.name?.trim();
  const nameShort = stage?.nameShort?.trim();
  const rawName = name || nameShort || `Stop ${sequence}`;
  const stopName = rawName.startsWith('Stop ') ? rawName : titleCasePlaceName(rawName);
  const stopCode =
    nameShort && nameShort.localeCompare(rawName, undefined, { sensitivity: 'accent' }) !== 0
      ? nameShort
      : null;
  return { stopName, stopCode };
}

type EtaTranslate = {
  now: string;
  minutes: (count: number) => string;
};

export function formatCirculationRows(
  circulations: MinibusCirculation[] | null | undefined,
  currentStopSequence: number | null | undefined,
  t: EtaTranslate,
): MinibusLiveEtaRow[] {
  if (!circulations?.length) {
    return [];
  }

  const sorted = [...circulations].sort((a, b) => a.sequence - b.sequence);

  return sorted.map((row) => {
    const due = row.dueInMinutes;
    let etaLabel: string;
    if (due == null || due <= 0) {
      etaLabel = t.now;
    } else {
      etaLabel = t.minutes(due);
    }

    const { stopName, stopCode } = circulationStopLabels(row.stage, row.sequence);

    return {
      sequence: row.sequence,
      stopName,
      stopCode,
      etaLabel,
      isCurrent: currentStopSequence != null && row.sequence === currentStopSequence,
    };
  });
}
