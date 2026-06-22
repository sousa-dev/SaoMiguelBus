import { create } from 'zustand';

import type { HopOnOffSource } from '@/features/hop-on-hop-off/lib/analytics';

interface HopOnOffModalState {
  open: boolean;
  source: HopOnOffSource | null;
  openHopOnHopOffSheet: (source: HopOnOffSource) => void;
  closeHopOnHopOffSheet: () => void;
}

export const useHopOnOffModalStore = create<HopOnOffModalState>((set) => ({
  open: false,
  source: null,
  openHopOnHopOffSheet: (source) => set({ open: true, source }),
  closeHopOnHopOffSheet: () => set({ open: false, source: null }),
}));
