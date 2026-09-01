import { useCallback, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';

export type LiveScreenActivity = {
  /** Expo-router screen focus (the user is on the live map route). */
  navFocused: boolean;
  /** Nav focused AND app foregrounded — the gate for polling only. */
  pollingActive: boolean;
};

/**
 * Navigation focus + AppState for a live map screen.
 *
 * The two values are deliberately separate. `navFocused` decides whether to hold
 * data at all; `pollingActive` decides whether to keep asking for more. A screen
 * that is focused but backgrounded should stop polling without throwing away
 * what it has, so the map is populated the instant the user returns rather than
 * flashing a spinner.
 *
 * Returns both from one subscription so a screen needing each does not register
 * two focus listeners.
 */
export function useLiveScreenActivity(): LiveScreenActivity {
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
