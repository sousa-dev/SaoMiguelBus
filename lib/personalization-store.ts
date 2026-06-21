import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ModuleKey } from '@/config/island';
import { postPersonalization } from '@/lib/api';
import { useConsentStore } from '@/lib/consent-store';
import { getOrCreateSessionId } from '@/lib/session';
import { staticIslandConfig } from '@/config/island';
import type { UserType } from '@/lib/types';

function personalizationStorageKey() {
  return `azores_hub_personalization_${staticIslandConfig.islandKey}`;
}

interface PersonalizationState {
  seen: boolean;
  completed: boolean;
  userType: UserType | null;
  interests: ModuleKey[];
  homeMunicipality: string | null;
  setUserType: (userType: UserType) => void;
  toggleInterest: (key: ModuleKey) => void;
  setHomeMunicipality: (key: string | null) => void;
  complete: () => Promise<void>;
  skip: () => void;
  resetAll: () => void;
}

async function syncToBackend(state: Pick<PersonalizationState, 'userType' | 'interests' | 'homeMunicipality'>) {
  const { decided, purposes } = useConsentStore.getState();
  if (!decided || !purposes.personalization) {
    return;
  }
  if (!state.userType) {
    return;
  }
  try {
    const sessionId = await getOrCreateSessionId();
    await postPersonalization(sessionId, {
      user_type: state.userType,
      interests: state.interests,
      home_municipality: state.homeMunicipality ?? '',
    });
  } catch {
    // Offline / dev without backend — local personalization still applies.
  }
}

export const usePersonalizationStore = create<PersonalizationState>()(
  persist(
    (set, get) => ({
      seen: false,
      completed: false,
      userType: null,
      interests: [],
      homeMunicipality: null,

      setUserType: (userType) => set({ userType }),

      toggleInterest: (key) => {
        const { interests } = get();
        if (interests.includes(key)) {
          set({ interests: interests.filter((item) => item !== key) });
          return;
        }
        set({ interests: [...interests, key] });
      },

      setHomeMunicipality: (key) => set({ homeMunicipality: key }),

      complete: async () => {
        const { userType, interests, homeMunicipality } = get();
        set({ seen: true, completed: true });
        await syncToBackend({ userType, interests, homeMunicipality });
      },

      skip: () => {
        set({ seen: true, completed: false });
      },

      resetAll: () => {
        set({
          seen: false,
          completed: false,
          userType: null,
          interests: [],
          homeMunicipality: null,
        });
      },
    }),
    {
      name: personalizationStorageKey(),
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        seen: state.seen,
        completed: state.completed,
        userType: state.userType,
        interests: state.interests,
        homeMunicipality: state.homeMunicipality,
      }),
    },
  ),
);
