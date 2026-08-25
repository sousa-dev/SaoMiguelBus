import React, { useEffect, useMemo, useRef, type ElementRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { Region } from 'react-native-maps';

import { OsmMapView } from '@/components/OsmMapView';
import { SeismicMapMarker } from '@/features/earthquakes/components/SeismicMapMarker';
import { seismicMarkerOverlay } from '@/features/earthquakes/lib/seismic-marker-overlay';
import { useAppTheme } from '@/lib/theme';
import {
  coordinateToRegion,
  getAzoresArchipelagoRegion,
  getSeismicMapRegion,
  isWithinAzoresBounds,
} from '@/lib/island-map';
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
  const mapRef = useRef<ElementRef<typeof OsmMapView>>(null);
  const initialRegion = useMemo(
    () => (events.length > 0 ? getSeismicMapRegion(events) : getAzoresArchipelagoRegion()),
    [events],
  );
  const userInAzores = useMemo(
    () => (userCoords ? isWithinAzoresBounds(userCoords.lat, userCoords.lng) : false),
    [userCoords],
  );

  const androidOverlays = useMemo(
    () => ({
      markers: events.map((event) =>
        seismicMarkerOverlay(event, theme, () => onMarkerPress?.(event)),
      ),
      polylines: [],
    }),
    [events, theme, onMarkerPress],
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
      <OsmMapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        androidOverlays={androidOverlays}
        minZoomLevel={4}
        maxZoomLevel={16}
        showsUserLocation={userInAzores}
        centerCoordinate={userInAzores ? userCoords : null}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
      >
        {Platform.OS === 'ios'
          ? events.map((event) => (
              <SeismicMapMarker
                key={event.id}
                event={event}
                onPress={() => onMarkerPress?.(event)}
              />
            ))
          : null}
      </OsmMapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', height: '100%' },
  map: { width: '100%', height: '100%' },
});

export type { Region };
