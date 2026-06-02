import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'azores_hub_theme_preference';

interface ThemePrefsState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemePrefsStore = create<ThemePrefsState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export function resolveColorScheme(
  preference: ThemePreference,
  systemScheme: string | null | undefined,
): 'light' | 'dark' {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }
  return systemScheme === 'dark' ? 'dark' : 'light';
}
