import React, { forwardRef } from 'react';
import { Platform } from 'react-native';
import MapView, { type MapViewProps } from 'react-native-maps';

import { OsmMapLayer } from '@/components/OsmMapLayer';
import { osmMapViewProps } from '@/lib/osm-map-props';

export type OsmMapViewProps = MapViewProps & {
  isDark?: boolean;
};

/**
 * MapView preconfigured for OpenStreetMap raster tiles on Android (Google provider + mapType none + UrlTile).
 * iOS uses Apple/Google provider with OSM overlay; Android hides Google basemap tiles.
 */
export const OsmMapView = forwardRef<MapView, OsmMapViewProps>(function OsmMapView(
  { isDark = false, children, provider, mapType, ...rest },
  ref,
) {
  if (Platform.OS === 'web') {
    return null;
  }

  const osm = osmMapViewProps();

  return (
    <MapView ref={ref} {...osm} provider={provider ?? osm.provider} mapType={mapType ?? osm.mapType} {...rest}>
      <OsmMapLayer isDark={isDark} />
      {children}
    </MapView>
  );
});
