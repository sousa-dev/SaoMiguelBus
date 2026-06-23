import type { MinibusCirculation } from '@/lib/types';

export type MinibusLiveEtaRow = {
  sequence: number;
  stopName: string;
  /** Upstream stop code (e.g. B 12) when it differs from the display name. */
  stopCode: string | null;
  etaLabel: string;
  isCurrent: boolean;
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
