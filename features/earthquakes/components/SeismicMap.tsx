import React, { useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT, UrlTile, type Region } from 'react-native-maps';

import { SeismicMapMarker } from '@/features/earthquakes/components/SeismicMapMarker';
import { getSeismicMapRegion } from '@/lib/island-map';
import type { SeismicEvent } from '@/lib/types';

type SeismicMapProps = {
  events: SeismicEvent[];
  userCoords?: { lat: number; lng: number } | null;
  onMarkerPress?: (event: SeismicEvent) => void;
};

/**
 * Archipelago-wide earthquake map. No island pan clamp — events may lie offshore.
 * Web has no react-native-maps MapView.
 */
export function SeismicMap({ events, userCoords, onMarkerPress }: SeismicMapProps) {
  const mapRef = useRef<MapView>(null);
  const initialRegion = useMemo(() => getSeismicMapRegion(events), [events]);

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        minZoomLevel={5}
        maxZoomLevel={14}
        showsUserLocation={Boolean(userCoords)}
        scrollEnabled
        zoomEnabled
      >
        {Platform.OS === 'android' ? (
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
        ) : null}
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
