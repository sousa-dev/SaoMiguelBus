import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deleteAuthToken, loadAuthToken, saveAuthToken } from '@/lib/secure-token';
import type { AuthUser } from '@/lib/types';

const AUTH_KEY = 'azores_hub_auth';

interface AuthState {
  /** Opaque DRF token. Held in memory; persisted to secure storage, not AsyncStorage. */
  token: string | null;
  /** Non-sensitive profile, persisted to AsyncStorage for instant UI on launch. */
  user: AuthUser | null;
  /** True once the secure token has been loaded at boot. */
  hydrated: boolean;
  setSession: (token: string, user: AuthUser) => Promise<void>;
  setUser: (user: AuthUser) => void;
  clearSession: () => Promise<void>;
  hydrate: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      setSession: async (token, user) => {
        await saveAuthToken(token);
        set({ token, user });
      },
      setUser: (user) => {
        set({ user });
      },
      clearSession: async () => {
        await deleteAuthToken();
        set({ token: null, user: null });
      },
      hydrate: async () => {
        const token = await loadAuthToken();
        set({ token: token ?? null, hydrated: true });
        if (token) {
          await useAuthStore.getState().refreshUser();
        }
      },
      refreshUser: async () => {
        const token = getAuthToken() ?? (await loadAuthToken());
        if (!token) {
          return;
        }
        try {
          const { fetchMe } = await import('@/lib/api');
          const user = await fetchMe();
          set({ user, token });
        } catch (error) {
          // Keep the session on transient failures; only clear on explicit 401.
          const { ApiRequestError } = await import('@/lib/api-errors');
          if (error instanceof ApiRequestError && error.status === 401) {
            await deleteAuthToken();
            set({ token: null, user: null });
          }
        }
      },
    }),
    {
      name: AUTH_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // Token lives in secure storage only; persist the profile for instant UI.
      partialize: (state) => ({ user: state.user }),
      // AsyncStorage's web backend touches window.localStorage. Auto-rehydrating at
      // module load would run that during Expo Router's Node-side SSR pass for web,
      // where window doesn't exist — so rehydrate is triggered explicitly from a
      // client-only effect instead (see app/_layout.tsx).
      skipHydration: true,
      onRehydrateStorage: () => () => {
        // Persist rehydration can overwrite a fresh /auth/me — refresh after cache load.
        void useAuthStore.getState().hydrate();
      },
    },
  ),
);

export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}

export function isSignedIn(): boolean {
  return Boolean(useAuthStore.getState().token);
}

export function isAdminUser(): boolean {
  return Boolean(useAuthStore.getState().user?.isSuperuser);
}
