import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT, type Region } from 'react-native-maps';

import { OsmMapLayer } from '@/components/OsmMapLayer';
import { SeismicMapMarker } from '@/features/earthquakes/components/SeismicMapMarker';
import { coordinateToRegion, getAzoresArchipelagoRegion, getSeismicMapRegion } from '@/lib/island-map';
import { useAppTheme } from '@/lib/theme';
import type { SeismicEvent } from '@/lib/types';

export type SeismicMapFocus = { lat: number; lng: number };

type SeismicMapProps = {
  events: SeismicEvent[];
  userCoords?: { lat: number; lng: number } | null;
  /** When set, animates the map to center on this coordinate. */
  focus?: SeismicMapFocus | null;
  onMarkerPress?: (event: SeismicEvent) => void;
};

/**
 * Archipelago-wide earthquake map. OSM tiles (no Google API key). Web has no MapView.
 */
const FOCUS_DELTA = 0.28;

export function SeismicMap({ events, userCoords, focus, onMarkerPress }: SeismicMapProps) {
  const theme = useAppTheme();
  const mapRef = useRef<MapView>(null);
  const initialRegion = useMemo(
    () => (events.length > 0 ? getSeismicMapRegion(events) : getAzoresArchipelagoRegion()),
    [events],
  );

  useEffect(() => {
    if (!focus || Platform.OS === 'web') {
      return;
    }
    const region = coordinateToRegion({ lat: focus.lat, lng: focus.lng }, FOCUS_DELTA);
    const id = requestAnimationFrame(() => {
      mapRef.current?.animateToRegion(region, 450);
    });
    return () => cancelAnimationFrame(id);
  }, [focus?.lat, focus?.lng]);

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        mapType="none"
        initialRegion={initialRegion}
        minZoomLevel={4}
        maxZoomLevel={16}
        showsUserLocation={Boolean(userCoords)}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
      >
        <OsmMapLayer isDark={theme.isDark} />
        {events.map((event) => (
          <SeismicMapMarker
            key={event.id}
            event={event}
            onPress={() => onMarkerPress?.(event)}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', height: '100%' },
  map: { width: '100%', height: '100%' },
});

export type { Region };
