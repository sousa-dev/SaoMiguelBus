import type { AppUpdateMode } from '@/lib/types';

export function shouldShowAppUpdatePrompt(input: {
  updateRequired: boolean;
  updateMode?: AppUpdateMode;
  currentVersion: string;
  dismissedVersion: string | null;
}): boolean {
  if (!input.updateRequired) {
    return false;
  }
  if (input.updateMode === 'required') {
    return true;
  }
  return input.dismissedVersion !== input.currentVersion;
}
