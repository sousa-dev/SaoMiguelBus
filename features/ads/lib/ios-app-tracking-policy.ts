/** Mirrors Google UMP guidance: skip ATT when GDPR applies without purpose-1 consent. */
export function shouldRequestIosAppTrackingPermission(
  gdprApplies: boolean,
  purposeConsents: string,
): boolean {
  return !gdprApplies || purposeConsents.startsWith('1');
}
