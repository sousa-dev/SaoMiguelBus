/**
 * Who may see the in-app developer tools: a dev build, or the Django superuser
 * flag — the same audience that opens marketplace moderation and the
 * changeover simulation. Gating on the flag rather than a hard-coded address
 * keeps the admin account swappable from the server and avoids shipping an
 * email literal in the bundle.
 *
 * Every consumer must re-apply this gate at the READ side, not just when
 * rendering the toggle: the overrides these tools set are persisted, so a
 * stored value can outlive the account that set it and must resolve to plain
 * user behaviour for everybody else.
 *
 * Sync (non-React) callers import `devToolsEnabled` from
 * `@/lib/dev-tools-flag` directly — importing it from here would drag
 * `react-native` into their graph via the auth store.
 */

import { useAuthStore } from '@/lib/auth-store';

export { devToolsEnabled } from '@/lib/dev-tools-flag';

/**
 * Subscribed variant, so signing out of an admin account drops the tools on
 * the spot instead of at the next remount.
 */
export function useDevToolsEnabled(): boolean {
  const isAdmin = useAuthStore((s) => Boolean(s.user?.isSuperuser));
  return __DEV__ || isAdmin;
}
