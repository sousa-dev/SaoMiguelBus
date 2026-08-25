import { useFocusEffect } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { useCallback } from 'react';
import { create } from 'zustand';

import type { FabAction } from '@/lib/fab-registry';

interface FabState {
  /** Actions injected by the currently focused screen. */
  runtimeActions: FabAction[];
  /** Optional icon for the collapsed FAB (overrides the first action's icon). */
  runtimeClosedIcon: LucideIcon | null;
  setRuntimeActions: (actions: FabAction[], closedIcon?: LucideIcon | null) => void;
  clearRuntimeActions: () => void;
}

export const useFabStore = create<FabState>((set) => ({
  runtimeActions: [],
  runtimeClosedIcon: null,
  setRuntimeActions: (actions, closedIcon = null) =>
    set({ runtimeActions: actions, runtimeClosedIcon: closedIcon }),
  clearRuntimeActions: () => set({ runtimeActions: [], runtimeClosedIcon: null }),
}));

/**
 * Register stateful FAB actions for as long as the calling screen is focused.
 * Actions are merged into the global speed-dial and cleared on blur.
 *
 * The caller MUST memoize `actions` (e.g. `useMemo`) so the effect does not
 * re-run on every render.
 */
export function useFabActions(actions: FabAction[], closedIcon?: LucideIcon | null): void {
  const setRuntimeActions = useFabStore((s) => s.setRuntimeActions);
  const clearRuntimeActions = useFabStore((s) => s.clearRuntimeActions);

  useFocusEffect(
    useCallback(() => {
      setRuntimeActions(actions, closedIcon ?? null);
      return () => clearRuntimeActions();
    }, [actions, closedIcon, setRuntimeActions, clearRuntimeActions]),
  );
}
