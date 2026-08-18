/**
 * Links into the web app, for things we hand to someone who may not have the
 * app installed. Overridable per build the same way `lib/legal-urls.ts` is, so
 * a staging build shares staging links instead of production ones.
 */
const APP_BASE = (
  process.env.EXPO_PUBLIC_APP_WEB_URL ?? 'https://app.saomiguelhub.com'
).replace(/\/$/, '');

export const APP_WEB_BASE_URL = APP_BASE;

/** `/transit/trip/:tripId` — the web app's trip detail route. */
export function tripWebUrl(tripId: number | string): string {
  return `${APP_BASE}/transit/trip/${encodeURIComponent(String(tripId))}`;
}

/**
 * `/transit?origin=&destination=` — the web app auto-runs the search when both
 * are present.
 *
 * This is the honest target for a whole journey: the web app has no journey
 * route, and a journey id (`"1234-3:5678-1"`) is a synthetic join of trip ids
 * that means nothing to it. The recipient lands on the same search instead.
 */
export function transitSearchWebUrl(origin: string, destination: string): string {
  const query = `origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(
    destination,
  )}`;
  return `${APP_BASE}/transit?${query}`;
}
