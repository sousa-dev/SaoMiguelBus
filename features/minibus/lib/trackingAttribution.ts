/** Public Eleven Systems live map for PDL Mini Bus (not the AVL API host). */
export const MINIBUS_PUBLIC_TRACKING_URL = 'https://tracking.elevensystems.pt/pdl';

const LEGACY_TRACKING_SOURCE_HOSTS = new Set(['pdl.elevensystems.pt']);

/** User-facing live tracker URL — never the AVL API root. */
export function resolvePublicTrackingUrl(sourceUrl?: string | null): string {
  if (!sourceUrl?.trim()) {
    return MINIBUS_PUBLIC_TRACKING_URL;
  }

  try {
    const parsed = new URL(sourceUrl);
    if (
      LEGACY_TRACKING_SOURCE_HOSTS.has(parsed.hostname) ||
      parsed.pathname.startsWith('/publicapi')
    ) {
      return MINIBUS_PUBLIC_TRACKING_URL;
    }
    if (parsed.hostname === 'tracking.elevensystems.pt') {
      return MINIBUS_PUBLIC_TRACKING_URL;
    }
  } catch {
    return MINIBUS_PUBLIC_TRACKING_URL;
  }

  return MINIBUS_PUBLIC_TRACKING_URL;
}
