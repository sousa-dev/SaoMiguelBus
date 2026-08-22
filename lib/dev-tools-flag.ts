/**
 * The developer-tools gate, with no React Native in its import graph.
 *
 * The audience is a dev build OR a signed-in Django superuser — the same
 * people who get marketplace moderation and the changeover simulation. The
 * admin half is mirrored here as a plain module flag rather than read from
 * `@/lib/auth-store`, because sync consumers such as the ads pipeline are
 * imported by node-based unit tests that cannot load `react-native` (the auth
 * store reaches it through `secure-token`). `@/lib/auth-store` pushes the flag
 * in on every session change; React callers should use `useDevToolsEnabled`
 * from `@/lib/dev-tools` instead, so the UI re-renders on sign-out.
 */

let adminSession = false;

/** Called by the auth store whenever the signed-in profile changes. */
export function setDevToolsAdmin(value: boolean): void {
  adminSession = value;
}

/** Non-hook accessor for use outside React (stores, plain helpers). */
export function devToolsEnabled(): boolean {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  return isDev || adminSession;
}
