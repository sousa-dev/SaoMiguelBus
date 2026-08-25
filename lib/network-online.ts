let latestOnline = true;

/** Synchronous online getter for non-React call sites (e.g. analytics flush). */
export function getNetworkOnline(): boolean {
  return latestOnline;
}

export function setNetworkOnline(next: boolean): void {
  latestOnline = next;
}
