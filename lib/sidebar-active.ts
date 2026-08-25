import type { Href } from 'expo-router';

import { MODULE_KEY_TO_TAB_SCREEN } from '@/lib/hub-tab-screens';
import type { SidebarNavItem } from '@/lib/modules';

function firstSegment(pathname: string): string {
  return pathname.replace(/^\/+/, '').split('/')[0] ?? '';
}

function hrefSegment(href: Href): string {
  if (typeof href === 'string') {
    return firstSegment(href);
  }
  return firstSegment(href.pathname ?? '');
}

export function isSidebarItemActive(pathname: string, item: SidebarNavItem): boolean {
  const current = firstSegment(pathname);
  if (item.section === 'hub') {
    return current === 'hub' || current === '';
  }
  if (item.section === 'app') {
    return current === hrefSegment(item.route);
  }
  if (item.moduleKey) {
    return current === MODULE_KEY_TO_TAB_SCREEN[item.moduleKey];
  }
  return false;
}
