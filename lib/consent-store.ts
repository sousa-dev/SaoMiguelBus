import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { postConsent } from '@/lib/api';
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
  setPurposes: (purposes: ConsentPurposes) => void;
  acceptAll: () => Promise<void>;
  rejectNonEssential: () => Promise<void>;
  saveCustom: (purposes: ConsentPurposes) => Promise<void>;
  hasAnalyticsConsent: () => boolean;
}

async function syncToBackend(purposes: ConsentPurposes) {
  try {
    const sessionId = await getOrCreateSessionId();
    await postConsent(sessionId, purposes);
  } catch {
    // Offline / dev without backend — local CMP still applies.
  }
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set, get) => ({
      decided: false,
      purposes: defaultPurposes,
      setPurposes: (purposes) => set({ purposes }),
      hasAnalyticsConsent: () => get().decided && get().purposes.analytics,
      acceptAll: async () => {
        const purposes: ConsentPurposes = {
          strictly_necessary: true,
          analytics: true,
          ads: true,
          personalization: true,
        };
        await syncToBackend(purposes);
        set({ decided: true, purposes });
      },
      rejectNonEssential: async () => {
        const purposes = { ...defaultPurposes };
        await syncToBackend(purposes);
        set({ decided: true, purposes });
      },
      saveCustom: async (purposes) => {
        const normalized = { ...defaultPurposes, ...purposes, strictly_necessary: true };
        await syncToBackend(normalized);
        set({ decided: true, purposes: normalized });
      },
    }),
    {
      name: CONSENT_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ decided: state.decided, purposes: state.purposes }),
    },
  ),
);
