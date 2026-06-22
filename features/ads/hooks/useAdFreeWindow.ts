import { useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAdFreeStore } from '@/features/ads/lib/ad-free-store';
import { isRewardedAdFreeUserType } from '@/features/ads/lib/reward-offer-availability';
import { adFreeRemainingMs, shouldShowAds } from '@/features/ads/lib/ad-visibility';
import { usePersonalizationStore } from '@/lib/personalization-store';
import { usePremium } from '@/lib/premium-store';

function useAdFreeDerived(isPremium: boolean) {
  const userType = usePersonalizationStore((s) => s.userType);
  const adFreeUntilMs = useAdFreeStore((s) => s.adFreeUntilMs);
  const nowMs = useAdFreeStore((s) => s.nowMs);
  const rewardEligible = isRewardedAdFreeUserType(userType);
  const effectiveUntilMs = isPremium || !rewardEligible ? null : adFreeUntilMs;
  const isAdFreeActive =
    !isPremium && effectiveUntilMs != null && effectiveUntilMs > nowMs;
  const remainingMs = isPremium ? 0 : adFreeRemainingMs(effectiveUntilMs, nowMs);
  const showAds = shouldShowAds(isPremium, effectiveUntilMs, nowMs);

  return {
    adFreeUntilMs: effectiveUntilMs,
    isAdFreeActive,
    remainingMs,
    showAds,
  };
}

/** Mount once at app root — hydrates storage and keeps expiry clock in sync. */
export function useAdFreeWindowBootstrap() {
  const isPremium = usePremium();
  const hydrated = useAdFreeStore((s) => s.hydrated);
  const hydrate = useAdFreeStore((s) => s.hydrate);
  const refresh = useAdFreeStore((s) => s.refresh);
  const tickNow = useAdFreeStore((s) => s.tickNow);
  const { isAdFreeActive, remainingMs } = useAdFreeDerived(isPremium);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        tickNow();
        void refresh();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [refresh, tickNow]);

  useEffect(() => {
    if (!isAdFreeActive || remainingMs <= 0) {
      return;
    }
    const tickMs = Math.min(remainingMs + 50, 60_000);
    const timer = setTimeout(() => {
      tickNow();
    }, tickMs);
    return () => clearTimeout(timer);
  }, [isAdFreeActive, remainingMs, tickNow]);

  return hydrated;
}

/**
 * Reactive device-local ad-free reward window (ignored when premium).
 * Backed by {@link useAdFreeStore} so all surfaces update immediately after a reward.
 */
export function useAdFreeWindow() {
  const isPremium = usePremium();
  const userType = usePersonalizationStore((s) => s.userType);
  const hydrated = useAdFreeStore((s) => s.hydrated);
  const refresh = useAdFreeStore((s) => s.refresh);
  const grantFromRewardStore = useAdFreeStore((s) => s.grantFromReward);
  const derived = useAdFreeDerived(isPremium);

  const grantFromReward = useCallback(async () => {
    if (isPremium || !isRewardedAdFreeUserType(userType)) {
      return null;
    }
    return grantFromRewardStore();
  }, [grantFromRewardStore, isPremium, userType]);

  return {
    hydrated,
    refresh,
    grantFromReward,
    ...derived,
  };
}
