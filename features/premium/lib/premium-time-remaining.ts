const MS_PER_DAY = 86_400_000;

/** Whole days remaining until `currentPeriodEnd` (ceil); 0 when expired or invalid. */
export function getPremiumDaysRemaining(
  currentPeriodEnd: string | null | undefined,
  now = Date.now(),
): number {
  if (!currentPeriodEnd) {
    return 0;
  }
  const endMs = new Date(currentPeriodEnd).getTime();
  const remainingMs = endMs - now;
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(remainingMs / MS_PER_DAY));
}
