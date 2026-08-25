import { useCallback, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';

type MinibusLiveScreenActivity = {
  /** Expo-router screen focus (user is on the live map route). */
  navFocused: boolean;
  /** Nav focused and app foreground — controls poll intervals only. */
  pollingActive: boolean;
};

/**
 * Navigation focus + AppState for the minibus live screen.
 * Prefer this when a screen needs both values (avoids duplicate focus subscriptions).
 */
export function useMinibusLiveScreenActivity(): MinibusLiveScreenActivity {
  const [navFocused, setNavFocused] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useFocusEffect(
    useCallback(() => {
      setNavFocused(true);
      setAppState(AppState.currentState);

      const sub = AppState.addEventListener('change', (next) => {
        setAppState(next);
      });

      return () => {
        setNavFocused(false);
        sub.remove();
      };
    }, []),
  );

  return {
    navFocused,
    pollingActive: navFocused && appState === 'active',
  };
}

/** True when the minibus live route is navigation-focused. */
export function useMinibusNavFocused(): boolean {
  return useMinibusLiveScreenActivity().navFocused;
}

/** True when live screen is focused and the app is foreground-active (poll gate). */
export function useMinibusPollingActive(): boolean {
  return useMinibusLiveScreenActivity().pollingActive;
}

/** @deprecated Use {@link useMinibusLiveScreenActivity} instead. */
export function useMinibusScreenActive(): boolean {
  return useMinibusLiveScreenActivity().pollingActive;
}
