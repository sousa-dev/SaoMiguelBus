import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { grantAdFreeWindow, loadAdFreeUntil } from '@/features/ads/lib/ad-free-storage';
import { adFreeRemainingMs, shouldShowAds } from '@/features/ads/lib/ad-visibility';
import { usePremium } from '@/lib/premium-store';

/**
 * Reactive device-local ad-free reward window (ignored when premium).
 */
export function useAdFreeWindow() {
  const isPremium = usePremium();
  const [adFreeUntilMs, setAdFreeUntilMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    const until = await loadAdFreeUntil();
    setAdFreeUntilMs(until);
    setNowMs(Date.now());
    setHydrated(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        setNowMs(Date.now());
        void refresh();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [refresh]);

  const isAdFreeActive =
    !isPremium && adFreeUntilMs != null && adFreeUntilMs > nowMs;
  const remainingMs = isPremium ? 0 : adFreeRemainingMs(adFreeUntilMs, nowMs);
  const showAds = shouldShowAds(isPremium, isPremium ? null : adFreeUntilMs, nowMs);

  useEffect(() => {
    if (!isAdFreeActive || remainingMs <= 0) {
      return;
    }
    const tickMs = Math.min(remainingMs + 50, 60_000);
    const timer = setTimeout(() => {
      setNowMs(Date.now());
    }, tickMs);
    return () => clearTimeout(timer);
  }, [isAdFreeActive, remainingMs]);

  const grantFromReward = useCallback(async () => {
    if (isPremium) {
      return null;
    }
    const until = await grantAdFreeWindow();
    setAdFreeUntilMs(until);
    setNowMs(Date.now());
    return until;
  }, [isPremium]);

  return {
    hydrated,
    adFreeUntilMs: isPremium ? null : adFreeUntilMs,
    isAdFreeActive,
    remainingMs,
    showAds,
    grantFromReward,
    refresh,
  };
}
