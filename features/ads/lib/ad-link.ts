import type { AdPayload } from '@/lib/types';

/**
 * Resolve the outbound href for an ad. Mirrors the legacy webapp: when
 * `action === 'directions'`, `target` is a place name opened in Google Maps;
 * otherwise `target` is a plain URL. Returns `null` when there is nowhere to go.
 */
export function resolveAdHref(ad: AdPayload): string | null {
  if (!ad.target) {
    return null;
  }
  if (ad.action === 'directions') {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ad.target)}`;
  }
  return ad.target;
}
