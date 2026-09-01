/** Moved to `features/live-tracking/hooks/useLiveScreenActivity`. */
import { useLiveScreenActivity } from '@/features/live-tracking/hooks/useLiveScreenActivity';

export const useMinibusLiveScreenActivity = useLiveScreenActivity;

/** True when the minibus live route is navigation-focused. */
export function useMinibusNavFocused(): boolean {
  return useLiveScreenActivity().navFocused;
}

/** True when live screen is focused and the app is foreground-active (poll gate). */
export function useMinibusPollingActive(): boolean {
  return useLiveScreenActivity().pollingActive;
}
