function firstSegment(pathname: string): string {
  return pathname.replace(/^\/+/, '').split('/')[0] ?? '';
}

/** Routes where the global sidebar trigger must not appear (modals / sheets). */
const HIDDEN_SEGMENTS = new Set(['feedback', 'settings', 'profile', 'onboarding']);

export function isSidebarTriggerHidden(pathname: string): boolean {
  return HIDDEN_SEGMENTS.has(firstSegment(pathname));
}
