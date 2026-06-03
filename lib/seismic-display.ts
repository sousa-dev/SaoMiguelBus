import type { TFunction } from 'i18next';

import type { SeismicEvent } from '@/lib/types';

const GENERIC_REGION = /^(AZORES(\s+REGION)?|AZORES\s+ISLAND)$/i;

export function isGenericSeismicRegion(region: string | undefined | null): boolean {
  if (!region?.trim()) {
    return true;
  }
  return GENERIC_REGION.test(region.trim());
}

export function seismicEventHeadline(event: SeismicEvent, t: TFunction): string | null {
  if (event.nearestIsland) {
    const distance = Math.round(event.nearestIsland.distanceKm);
    return t('seismicNearIsland', {
      distance,
      bearing: event.nearestIsland.bearing,
      island: event.nearestIsland.name,
    });
  }

  const region = event.region?.trim();
  if (region && !isGenericSeismicRegion(region)) {
    return region;
  }

  return null;
}

export function seismicMagnitudeLabel(magnitude: number, t: TFunction): string {
  if (magnitude >= 5) {
    return t('seismicMagStrong');
  }
  if (magnitude >= 4) {
    return t('seismicMagModerate');
  }
  if (magnitude >= 3) {
    return t('seismicMagLight');
  }
  if (magnitude >= 2) {
    return t('seismicMagMinor');
  }
  return t('seismicMagMicro');
}
