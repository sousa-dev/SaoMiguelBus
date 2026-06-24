/** Session-only dismiss for optional update prompts (resets on cold start). */

let sessionDismissedVersion: string | null = null;

/** Test hook — reset session dismiss state. */
export function resetAppUpdateDismissSession(): void {
  sessionDismissedVersion = null;
}

export function getDismissedAppUpdateVersion(): Promise<string | null> {
  return Promise.resolve(sessionDismissedVersion);
}

export function setDismissedAppUpdateVersion(version: string): Promise<void> {
  sessionDismissedVersion = version;
  return Promise.resolve();
}
