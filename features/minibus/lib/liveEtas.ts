import type { MinibusCirculation } from '@/lib/types';

export type MinibusLiveEtaRow = {
  sequence: number;
  stopName: string;
  etaLabel: string;
  isCurrent: boolean;
};

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

    return {
      sequence: row.sequence,
      stopName: row.stage?.nameShort ?? row.stage?.name ?? `Stop ${row.sequence}`,
      etaLabel,
      isCurrent: currentStopSequence != null && row.sequence === currentStopSequence,
    };
  });
}
