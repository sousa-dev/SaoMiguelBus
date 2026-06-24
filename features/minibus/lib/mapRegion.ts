import type { Region } from 'react-native-maps';

import type { MapBounds } from '@/lib/island-map';

/** Geographic extent of the PDL Mini Bus network (Ponta Delgada urban area). */
export const pdlMinibusMapBounds: MapBounds = {
  southWest: { lat: 37.733787, lng: -25.695819 },
  northEast: { lat: 37.753787, lng: -25.650484 },
};

const VIEWPORT_PAD = 1.18;

/** Default live-map viewport when no vehicles are on the network. */
export function getPdlMinibusMapRegion(viewportPad = VIEWPORT_PAD): Region {
  const { southWest, northEast } = pdlMinibusMapBounds;
  const latSpan = northEast.lat - southWest.lat;
  const lngSpan = northEast.lng - southWest.lng;
  return {
    latitude: (southWest.lat + northEast.lat) / 2,
    longitude: (southWest.lng + northEast.lng) / 2,
    latitudeDelta: latSpan * viewportPad,
    longitudeDelta: lngSpan * viewportPad,
  };
}
