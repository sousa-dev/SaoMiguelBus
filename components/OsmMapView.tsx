import React, { forwardRef, useMemo, useRef, useState } from 'react';
import { LocateFixed, Minus, Plus } from 'lucide-react-native';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { type MapViewProps, type Region } from 'react-native-maps';
import { useTranslation } from 'react-i18next';

import { AndroidOsmWebMap, type AndroidOsmWebMapHandle } from '@/components/AndroidOsmWebMap';
import { IconButton } from '@/components/ui/IconButton';
import { MapLoadingOverlay } from '@/components/MapLoadingOverlay';
import { getIslandMapRegion, coordinateToRegion } from '@/lib/island-map';
import { mergeMapOverlays, mapOverlaysFromChildren, type MapOverlaySpec } from '@/lib/map-overlays';
import { osmMapViewProps } from '@/lib/osm-map-props';

export type OsmMapViewProps = MapViewProps & {
  isDark?: boolean;
  showLoadingIndicator?: boolean;
  /** Pan target for the optional center-on-location control. */
  centerCoordinate?: { lat: number; lng: number } | null;
  /** Blue-dot position on Android WebView; defaults to centerCoordinate when omitted. */
  userLocationCoordinate?: { lat: number; lng: number } | null;
  showCenterControl?: boolean;
  onMapControlPress?: (action: 'center' | 'zoom_in' | 'zoom_out') => void;
  /** Extra Android overlays when children are wrapper components (traffic / seismic markers). */
  androidOverlays?: MapOverlaySpec;
};

type MapHandle = MapView | AndroidOsmWebMapHandle;

/**
 * iOS: Apple Maps via react-native-maps.
 * Android: Leaflet + CARTO/OSM tiles in WebView (no Google Maps SDK or logo).
 */
export const OsmMapView = forwardRef<MapHandle, OsmMapViewProps>(function OsmMapView(
  {
    isDark = false,
    showLoadingIndicator = true,
    children,
    androidOverlays,
    provider,
    mapType,
    style,
    initialRegion,
    region,
    centerCoordinate,
    userLocationCoordinate,
    showCenterControl = true,
    onMapControlPress,
    showsUserLocation,
    scrollEnabled = true,
    zoomEnabled = true,
    minZoomLevel,
    maxZoomLevel,
    onMapReady,
    onMapLoaded,
    onRegionChangeComplete,
    onPress,
    onLongPress,
    ...rest
  },
  ref,
) {
  const { t } = useTranslation();
  const mapRef = useRef<MapHandle | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(() =>
    isConcreteRegion(region) ? region : initialRegion ?? null,
  );

  const controlledRegion = isConcreteRegion(region) ? region : null;
  const androidOverlaySpec = useMemo(
    () => mergeMapOverlays(androidOverlays ?? { markers: [], polylines: [] }, mapOverlaysFromChildren(children)),
    [androidOverlays, children],
  );
  const androidInitialRegionRef = useRef<Region | null>(null);
  if (!androidInitialRegionRef.current) {
    androidInitialRegionRef.current =
      initialRegion ?? controlledRegion ?? currentRegion ?? getIslandMapRegion();
  }
  const androidInitialRegion = androidInitialRegionRef.current;

  if (Platform.OS === 'web') {
    return null;
  }

  const osm = osmMapViewProps();
  const targetRegion = currentRegion ?? controlledRegion ?? initialRegion ?? null;
  const hideLoading = () => setLoading(false);
  const setRefs = (node: MapHandle | null) => {
    mapRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<MapHandle | null>).current = node;
    }
  };

  const handleMapReady: MapViewProps['onMapReady'] = (...args) => {
    hideLoading();
    onMapReady?.(...args);
  };

  const handleMapLoaded: MapViewProps['onMapLoaded'] = (...args) => {
    hideLoading();
    onMapLoaded?.(...args);
  };

  const handleRegionChangeComplete: MapViewProps['onRegionChangeComplete'] = (next, details) => {
    setCurrentRegion(next);
    onRegionChangeComplete?.(next, details);
  };

  const zoomBy = (factor: number) => {
    if (!targetRegion) {
      return;
    }
    onMapControlPress?.(factor < 1 ? 'zoom_in' : 'zoom_out');
    const next = {
      ...targetRegion,
      latitudeDelta: targetRegion.latitudeDelta * factor,
      longitudeDelta: targetRegion.longitudeDelta * factor,
    };
    setCurrentRegion(next);
    mapRef.current?.animateToRegion(next, 180);
  };

  const centerOnUser = () => {
    if (!centerCoordinate) {
      return;
    }
    onMapControlPress?.('center');
    const next = coordinateToRegion(centerCoordinate, 0.012);
    setCurrentRegion(next);
    mapRef.current?.animateToRegion(next, 220);
  };

  const dotCoordinate = userLocationCoordinate ?? centerCoordinate;
  const userLocation =
    showsUserLocation && dotCoordinate
      ? { latitude: dotCoordinate.lat, longitude: dotCoordinate.lng }
      : null;

  const controls = [
    {
      key: 'zoom-in',
      icon: Plus,
      label: t('mapZoomIn'),
      onPress: () => zoomBy(0.55),
    },
    {
      key: 'zoom-out',
      icon: Minus,
      label: t('mapZoomOut'),
      onPress: () => zoomBy(1.8),
    },
    ...(centerCoordinate && showCenterControl
      ? [
          {
            key: 'center',
            icon: LocateFixed,
            label: t('mapCenterOnLocation'),
            onPress: centerOnUser,
          },
        ]
      : []),
  ];

  if (Platform.OS === 'android') {
    return (
      <View style={style}>
        <AndroidOsmWebMap
          ref={setRefs}
          initialRegion={androidInitialRegion}
          overlays={androidOverlaySpec}
          isDark={isDark}
          scrollEnabled={scrollEnabled}
          zoomEnabled={zoomEnabled}
          minZoomLevel={minZoomLevel}
          maxZoomLevel={maxZoomLevel}
          showsUserLocation={!!showsUserLocation}
          userLocation={userLocation}
          onMapReady={(event) => handleMapReady(event)}
          onMapLoaded={(event) => handleMapLoaded(event)}
          onRegionChangeComplete={(next, details) => handleRegionChangeComplete(next, details)}
          onPress={onPress}
          onLongPress={onLongPress}
        />
        <View style={styles.controls} pointerEvents="box-none">
          {controls.map((control) => (
            <IconButton
              key={control.key}
              icon={control.icon}
              size="sm"
              variant="tonal"
              accessibilityLabel={control.label}
              onPress={control.onPress}
              style={styles.controlButton}
            />
          ))}
        </View>
        {showLoadingIndicator ? <MapLoadingOverlay visible={loading} /> : null}
      </View>
    );
  }

  return (
    <View style={style}>
      <MapView
        ref={setRefs}
        style={StyleSheet.absoluteFill}
        {...osm}
        provider={provider ?? osm.provider}
        mapType={mapType ?? osm.mapType}
        initialRegion={initialRegion}
        region={region}
        showsUserLocation={showsUserLocation}
        scrollEnabled={scrollEnabled}
        zoomEnabled={zoomEnabled}
        minZoomLevel={minZoomLevel}
        maxZoomLevel={maxZoomLevel}
        onMapReady={handleMapReady}
        onMapLoaded={handleMapLoaded}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={onPress}
        onLongPress={onLongPress}
        {...rest}
      >
        {children}
      </MapView>
      <View style={styles.controls} pointerEvents="box-none">
        {controls.map((control) => (
          <IconButton
            key={control.key}
            icon={control.icon}
            size="sm"
            variant="tonal"
            accessibilityLabel={control.label}
            onPress={control.onPress}
            style={styles.controlButton}
          />
        ))}
      </View>
      {showLoadingIndicator ? <MapLoadingOverlay visible={loading} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  controls: {
    position: 'absolute',
    top: 10,
    right: 10,
    gap: 8,
  },
  controlButton: {
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});

function isConcreteRegion(value: MapViewProps['region']): value is Region {
  return (
    value != null &&
    typeof value.latitude === 'number' &&
    typeof value.longitude === 'number' &&
    typeof value.latitudeDelta === 'number' &&
    typeof value.longitudeDelta === 'number'
  );
}
