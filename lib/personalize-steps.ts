import type { UserType } from '@/lib/types';

/** Personalize wizard has four steps: language, user type, interests, municipality. */
export const PERSONALIZE_STEP_COUNT = 4;

/** User-type step index — the only step that requires a selection before advancing. */
export const PERSONALIZE_USER_TYPE_STEP = 1;

export function canAdvancePersonalizeStep(step: number, userType: UserType | null): boolean {
  switch (step) {
    case 0:
      return true;
    case PERSONALIZE_USER_TYPE_STEP:
      return userType !== null;
    case 2:
    case 3:
      return true;
    default:
      return false;
  }
}
