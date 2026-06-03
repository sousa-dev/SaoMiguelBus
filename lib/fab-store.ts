import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { create } from 'zustand';

import type { FabAction } from '@/lib/fab-registry';

interface FabState {
  /** Actions injected by the currently focused screen. */
  runtimeActions: FabAction[];
  setRuntimeActions: (actions: FabAction[]) => void;
  clearRuntimeActions: () => void;
}

export const useFabStore = create<FabState>((set) => ({
  runtimeActions: [],
  setRuntimeActions: (actions) => set({ runtimeActions: actions }),
  clearRuntimeActions: () => set({ runtimeActions: [] }),
}));

/**
 * Register stateful FAB actions for as long as the calling screen is focused.
 * Actions are merged into the global speed-dial and cleared on blur.
 *
 * The caller MUST memoize `actions` (e.g. `useMemo`) so the effect does not
 * re-run on every render.
 */
export function useFabActions(actions: FabAction[]): void {
  const setRuntimeActions = useFabStore((s) => s.setRuntimeActions);
  const clearRuntimeActions = useFabStore((s) => s.clearRuntimeActions);

  useFocusEffect(
    useCallback(() => {
      setRuntimeActions(actions);
      return () => clearRuntimeActions();
    }, [actions, setRuntimeActions, clearRuntimeActions]),
  );
}
