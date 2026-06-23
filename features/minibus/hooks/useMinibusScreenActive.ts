import { useCallback, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';

/**
 * True when the minibus live screen is navigation-focused and the app is foreground-active.
 */
export function useMinibusScreenActive(): boolean {
  const [focused, setFocused] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setAppState(AppState.currentState);

      const sub = AppState.addEventListener('change', (next) => {
        setAppState(next);
      });

      return () => {
        setFocused(false);
        sub.remove();
      };
    }, []),
  );

  return focused && appState === 'active';
}
