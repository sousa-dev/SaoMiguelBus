/**
 * The changeover simulation switch (dev + admin only).
 *
 * Persisted so a reload does not silently drop a tester back onto the real
 * config mid-session — the changeover touches enough surfaces (banner, badge,
 * preview toggle, tracking, maps, the dataset on the wire) that losing the
 * override halfway through a pass is worse than the storage cost.
 *
 * Read it through `useSimulatedPhase`, never directly: the raw value survives
 * in storage for a user who later signs out of an admin account, and only the
 * gated hook can be trusted to be `'off'` for everybody else.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { SimulatedPhase } from '@/features/transit/lib/schedule-config';
import { useDevToolsEnabled } from '@/lib/dev-tools';

const SCHEDULE_DEV_KEY = 'azores_hub_schedule_dev';

interface ScheduleDevState {
  simulatedPhase: SimulatedPhase;
  setSimulatedPhase: (phase: SimulatedPhase) => void;
}

export const useScheduleDevStore = create<ScheduleDevState>()(
  persist(
    (set) => ({
      simulatedPhase: 'off',
      setSimulatedPhase: (phase) => set({ simulatedPhase: phase }),
    }),
    {
      name: SCHEDULE_DEV_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ simulatedPhase: state.simulatedPhase }),
    },
  ),
);

/**
 * Whether this device may simulate the changeover at all — the shared
 * developer-tools audience: a dev build, or the same superuser flag that opens
 * marketplace moderation.
 */
export function useCanSimulateSchedule(): boolean {
  return useDevToolsEnabled();
}

/** The effective override — always `'off'` for users who may not simulate. */
export function useSimulatedPhase(): SimulatedPhase {
  const stored = useScheduleDevStore((s) => s.simulatedPhase);
  const allowed = useCanSimulateSchedule();
  return allowed ? stored : 'off';
}
