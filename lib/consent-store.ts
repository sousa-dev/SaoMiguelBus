import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { postConsent } from '@/lib/api';
import {
  canInitAdMobFromState,
  canShowPersonalizedAdsFromState,
} from '@/lib/consent-gates';
import { getOrCreateSessionId } from '@/lib/session';
import type { ConsentPurposes } from '@/lib/types';

const CONSENT_KEY = 'azores_hub_consent';

export const defaultPurposes: ConsentPurposes = {
  strictly_necessary: true,
  analytics: false,
  ads: false,
  personalization: false,
};

interface ConsentState {
  decided: boolean;
  purposes: ConsentPurposes;
  policyVersion: string | null;
  setPurposes: (purposes: ConsentPurposes) => void;
  acceptAll: (policyVersion?: string) => Promise<void>;
  rejectNonEssential: (policyVersion?: string) => Promise<void>;
  saveCustom: (purposes: ConsentPurposes, policyVersion?: string) => Promise<void>;
  hasAnalyticsConsent: () => boolean;
  requireReconsent: () => void;
}

async function syncToBackend(purposes: ConsentPurposes) {
  try {
    const sessionId = await getOrCreateSessionId();
    await postConsent(sessionId, purposes);
  } catch {
    // Offline / dev without backend — local CMP still applies.
  }
}

async function purgeAnalyticsIfRejected(purposes: ConsentPurposes) {
  if (!purposes.analytics) {
    const { purgeAnalyticsQueue } = await import('@/lib/analytics-queue');
    await purgeAnalyticsQueue();
  }
}

function persistDecision(
  set: (partial: Partial<ConsentState>) => void,
  purposes: ConsentPurposes,
  policyVersion?: string,
) {
  set({
    decided: true,
    purposes,
    ...(policyVersion ? { policyVersion } : {}),
  });
}

/**
 * First-party SMB banners (compat `/api/v1/ad`) are shown to every non-premium
 * user regardless of `purposes.ads`. The free tier is ad-supported by design.
 * @deprecated Prefer `shouldShowAds()` from `@/features/ads/lib/ad-visibility`.
 */
export function canShowFirstPartyAds(isPremium: boolean): boolean {
  return !isPremium;
}

/** Whether AdMob may initialize after CMP decision and while ads should show. */
export function canInitAdMob(shouldShowAds: boolean): boolean {
  const { decided } = useConsentStore.getState();
  return canInitAdMobFromState(decided, shouldShowAds);
}

/** Whether AdMob may load for a non-premium user (e.g. rewarded video while ad-free). */
export function canInitAdMobForUser(isPremium: boolean): boolean {
  const { decided } = useConsentStore.getState();
  return canInitAdMobFromState(decided, !isPremium);
}

/** Product-layer opt-in to personalized AdMob ads (`purposes.ads`). */
export function canShowPersonalizedAds(): boolean {
  const { decided, purposes } = useConsentStore.getState();
  return canShowPersonalizedAdsFromState(decided, purposes.ads);
}

/** @deprecated Use `canShowPersonalizedAds()` — kept for transitional imports. */
export function canShowExternalAds(): boolean {
  return canShowPersonalizedAds();
}

/** Whether AdMob SDK init is allowed (alias of `canInitAdMob`). */
export function shouldInitAdMob(shouldShowAds: boolean): boolean {
  return canInitAdMob(shouldShowAds);
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set, get) => ({
      decided: false,
      purposes: defaultPurposes,
      policyVersion: null,
      setPurposes: (purposes) => set({ purposes }),
      hasAnalyticsConsent: () => get().decided && get().purposes.analytics,
      requireReconsent: () => set({ decided: false }),
      acceptAll: async (policyVersion) => {
        const purposes: ConsentPurposes = {
          strictly_necessary: true,
          analytics: true,
          ads: true,
          personalization: true,
        };
        await syncToBackend(purposes);
        persistDecision(set, purposes, policyVersion);
      },
      rejectNonEssential: async (policyVersion) => {
        const purposes = { ...defaultPurposes };
        await syncToBackend(purposes);
        await purgeAnalyticsIfRejected(purposes);
        persistDecision(set, purposes, policyVersion);
      },
      saveCustom: async (purposes, policyVersion) => {
        const normalized = { ...defaultPurposes, ...purposes, strictly_necessary: true };
        await syncToBackend(normalized);
        await purgeAnalyticsIfRejected(normalized);
        persistDecision(set, normalized, policyVersion);
      },
    }),
    {
      name: CONSENT_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        decided: state.decided,
        purposes: state.purposes,
        policyVersion: state.policyVersion,
      }),
    },
  ),
);
