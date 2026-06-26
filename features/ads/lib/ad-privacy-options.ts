/** Google UMP privacy-options entry point requirement (AdsConsentInfo field). */
export type AdPrivacyOptionsRequirementStatus = 'UNKNOWN' | 'REQUIRED' | 'NOT_REQUIRED';

export type AdPrivacyOptionsOutcome = 'shown' | 'not_required' | 'unavailable' | 'error';

export function isAdPrivacyOptionsRequired(
  status: AdPrivacyOptionsRequirementStatus,
): boolean {
  return status === 'REQUIRED';
}
