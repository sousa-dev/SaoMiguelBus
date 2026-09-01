import type { LiveCirculation } from '@/features/live-tracking/types';

export type LiveEtaRow = {
  sequence: number;
  stopName: string;
  /** Upstream stop code (e.g. B 12) when it differs from the display name. */
  stopCode: string | null;
  etaLabel: string;
  isCurrent: boolean;
  /** Set when the operator changed the name after our last sync. */
  stopId: number | null;
};

const ROMAN_NUMERAL = /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i;

function isRomanNumeral(word: string): boolean {
  return /^[IVXLCDM]+$/i.test(word) && ROMAN_NUMERAL.test(word);
}

function titleCaseWord(word: string, index: number, prepositions: Set<string>): string {
  if (index > 0 && prepositions.has(word)) {
    return word;
  }
  if (isRomanNumeral(word)) {
    return word.toUpperCase();
  }
  if (word.startsWith('(') && word.length > 1) {
    const inner = word.slice(1);
    if (isRomanNumeral(inner.replace(/[).,;:!?]+$/, ''))) {
      return `(${inner.toUpperCase()}`;
    }
    return `(${inner.charAt(0).toUpperCase()}${inner.slice(1)}`;
  }
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function titleCasePlaceName(value: string): string {
  const prepositions = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
  return value
    .toLocaleLowerCase('pt')
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => titleCaseWord(word, index, prepositions))
    .join(' ');
}

function circulationStopLabels(stage: LiveCirculation['stage'], sequence: number): {
  stopName: string;
  stopCode: string | null;
} {
  // A server-resolved name wins outright. Title-casing the operator's spelling
  // is a fallback for feeds that send nothing better (minibus), not a
  // second opinion -- where both exist they can legitimately disagree.
  const canonical = stage?.canonicalName?.trim();
  const name = canonical || stage?.name?.trim();
  const nameShort = stage?.nameShort?.trim();
  const rawName = name || nameShort || `Stop ${sequence}`;
  const stopName = canonical
    ? canonical
    : rawName.startsWith('Stop ')
      ? rawName
      : titleCasePlaceName(rawName);
  const stopCode =
    nameShort && nameShort.localeCompare(rawName, undefined, { sensitivity: 'accent' }) !== 0
      ? nameShort
      : null;
  return { stopName, stopCode };
}

/** Display name for the circulation row matching upstream currentStopSequence (next/target stop). */
export function stopDisplayNameFromCirculations(
  circulations: LiveCirculation[] | null | undefined,
  sequence: number | null | undefined,
): string | null {
  if (sequence == null || !circulations?.length) {
    return null;
  }
  const row = circulations.find((circulation) => circulation.sequence === sequence);
  if (!row) {
    return null;
  }
  return circulationStopLabels(row.stage, row.sequence).stopName;
}

type EtaTranslate = {
  now: string;
  minutes: (count: number) => string;
  unavailable: string;
};

const ETA_UNAVAILABLE = '—';

function formatEtaLabel(
  row: LiveCirculation,
  currentStopSequence: number | null | undefined,
  t: EtaTranslate,
): string {
  const due = row.dueInMinutes;

  if (currentStopSequence != null) {
    if (row.sequence < currentStopSequence) {
      return ETA_UNAVAILABLE;
    }
    if (row.sequence === currentStopSequence) {
      return t.now;
    }
    if (due != null && due > 0) {
      return t.minutes(due);
    }
    if (due === 0) {
      return t.now;
    }
    return t.unavailable;
  }

  if (due != null && due > 0) {
    return t.minutes(due);
  }
  if (due != null && due <= 0) {
    return t.now;
  }
  return t.unavailable;
}

export function formatCirculationRows(
  circulations: LiveCirculation[] | null | undefined,
  currentStopSequence: number | null | undefined,
  t: EtaTranslate,
): LiveEtaRow[] {
  if (!circulations?.length) {
    return [];
  }

  const sorted = [...circulations].sort((a, b) => a.sequence - b.sequence);

  return sorted.map((row) => {
    const etaLabel = formatEtaLabel(row, currentStopSequence, t);
    const { stopName, stopCode } = circulationStopLabels(row.stage, row.sequence);

    return {
      sequence: row.sequence,
      stopName,
      stopCode,
      etaLabel,
      isCurrent: currentStopSequence != null && row.sequence === currentStopSequence,
      stopId: row.stage?.stopId ?? null,
    };
  });
}
