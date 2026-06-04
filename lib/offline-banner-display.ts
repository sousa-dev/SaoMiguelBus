import { normalizePath } from '@/lib/fab-registry';

export type OfflineBannerVariant = 'icon' | 'pill';

/** Tab-root stacks: crowded header (menu + title + settings / premium). */
const MODULE_TAB_ROOTS = new Set([
  'hub',
  'transit',
  'news',
  'earthquakes',
  'trails',
  'marketplace',
  'traffic',
  'tours',
  'weather',
]);

/**
 * `icon` on module home/search screens (e.g. transit index) so the indicator
 * does not collide with header actions. `pill` elsewhere for fuller context.
 */
export function resolveOfflineBannerVariant(pathname: string): OfflineBannerVariant {
  const parts = normalizePath(pathname).split('/').filter(Boolean);
  if (parts.length === 1 && MODULE_TAB_ROOTS.has(parts[0]!)) {
    return 'icon';
  }
  return 'pill';
}
