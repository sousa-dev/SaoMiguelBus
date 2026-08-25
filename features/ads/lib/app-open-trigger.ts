import type { AppStateStatus } from 'react-native';

/**
 * How long after process start the app-open ad stays suppressed.
 *
 * Android can report `background` while the launch activity is still resuming,
 * which otherwise looks identical to a foreground return.
 */
export const APP_OPEN_LAUNCH_GRACE_MS = 10_000;

export type ForegroundReturnInput = {
  /** True once the app has actually been observed in the `background` state. */
  wasBackgrounded: boolean;
  nextState: AppStateStatus;
  /** Milliseconds elapsed since the JS bundle started running. */
  msSinceLaunch: number;
};

/**
 * Decide whether an `AppState` change is a real return to the app.
 *
 * `inactive` is not a foreground return: iOS reports it for the app switcher,
 * Control Center, incoming calls, and — critically — the ATT prompt and the UMP
 * consent form, both of which run seconds after a cold start. Only a state that
 * genuinely reached `background` counts, so a system modal can never surface a
 * full-screen ad on launch.
 */
export function shouldTreatAsForegroundReturn(input: ForegroundReturnInput): boolean {
  if (input.nextState !== 'active') {
    return false;
  }
  if (!input.wasBackgrounded) {
    return false;
  }
  return input.msSinceLaunch > APP_OPEN_LAUNCH_GRACE_MS;
}
