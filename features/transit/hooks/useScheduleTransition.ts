/**
 * Invalidate the transit cache at `nextTransitionAt` (03 §1, 98 §4 gap).
 *
 * Bootstrap is persisted for 24h (`lib/query-provider.tsx`), `useBootstrap` has a
 * 5-minute staleTime, and `useBootstrapCached` is `enabled: false` — it never
 * refetches. App foreground only flushed analytics. So without this, a config
 * cached on 31 August is still being applied on 1 September, and a results screen
 * left open across midnight keeps August's answers.
 *
 * Two triggers, because either alone leaves a hole:
 *   - a timer armed at the instant, for an app left in the foreground;
 *   - a foreground check, for an app that was backgrounded across it.
 */

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import {
  msUntilTransition,
  shouldInvalidateAt,
} from '@/features/transit/lib/schedule-config';
import type { TransitScheduleConfig } from '@/lib/types';

/** setTimeout clamps above this, so long waits are re-armed on foreground instead. */
const MAX_TIMER_MS = 2 ** 31 - 1;

export function useScheduleTransition(config: TransitScheduleConfig | null | undefined) {
  const queryClient = useQueryClient();
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    const invalidate = () => {
      const transition = config?.nextTransitionAt ?? null;
      // Once per transition instant: re-arming on every foreground would
      // otherwise refetch the world each time the app is opened.
      if (firedFor.current === transition) {
        return;
      }
      firedFor.current = transition;
      void queryClient.invalidateQueries({ queryKey: ['bootstrap'] });
      void queryClient.invalidateQueries({ queryKey: ['transit'] });
    };

    const check = () => {
      if (shouldInvalidateAt(config, Date.now())) {
        invalidate();
      }
    };

    check();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const delay = msUntilTransition(config, Date.now());
    if (delay != null && delay <= MAX_TIMER_MS) {
      timer = setTimeout(invalidate, delay);
    }

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        check();
      }
    });

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      sub.remove();
    };
  }, [config, queryClient]);
}
