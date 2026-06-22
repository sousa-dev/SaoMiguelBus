/** Schedule a one-shot callback when a premium period ends (+ buffer). Returns cancel fn. */
export function schedulePremiumExpirySync(
  currentPeriodEnd: string | null | undefined,
  onSync: () => void,
  bufferMs = 1000,
): () => void {
  if (!currentPeriodEnd) {
    return () => {};
  }
  const endMs = new Date(currentPeriodEnd).getTime();
  const delay = endMs - Date.now() + bufferMs;
  if (!Number.isFinite(delay) || delay <= 0) {
    onSync();
    return () => {};
  }
  const timer = setTimeout(onSync, delay);
  return () => clearTimeout(timer);
}
