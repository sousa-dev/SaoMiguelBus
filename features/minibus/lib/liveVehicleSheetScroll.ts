import type { MinibusLiveEtaRow } from '@/features/minibus/lib/liveEtas';

/** Index of the "Now" stop row when opening the live vehicle sheet. */
export function scrollTargetIndex(rows: MinibusLiveEtaRow[]): number {
  if (!rows.length) {
    return -1;
  }
  const currentIdx = rows.findIndex((row) => row.isCurrent);
  return currentIdx >= 0 ? currentIdx : 0;
}
