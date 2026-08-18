import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { StyleSheet } from 'react-native';
import type { MapViewProps, Region } from 'react-native-maps';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { leafletMapHtml, type LeafletMapConfig } from '@/lib/leaflet-map-html';
import type { MapOverlaySpec } from '@/lib/map-overlays';

export type AndroidOsmWebMapHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
  fitToCoordinates: (
    coordinates: { latitude: number; longitude: number }[],
    options?: {
      edgePadding?: { top: number; right: number; bottom: number; left: number };
      animated?: boolean;
    },
  ) => void;
};

type Props = {
  initialRegion: Region;
  overlays: MapOverlaySpec;
  isDark?: boolean;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  minZoomLevel?: number;
  maxZoomLevel?: number;
  showsUserLocation?: boolean;
  userLocation?: { latitude: number; longitude: number } | null;
  onMapReady?: MapViewProps['onMapReady'];
  onMapLoaded?: MapViewProps['onMapLoaded'];
  onRegionChangeComplete?: MapViewProps['onRegionChangeComplete'];
  onPress?: MapViewProps['onPress'];
  onLongPress?: MapViewProps['onLongPress'];
};

/** Hard cap: if the WebView never reports ready/error, stop showing the spinner anyway. */
const READY_WATCHDOG_MS = 9000;

type MarkerCallbacks = {
  onPress?: () => void;
  onDragEnd?: (coordinate: { latitude: number; longitude: number }) => void;
};

function escapeForInject(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, '');
}

export const AndroidOsmWebMap = forwardRef<AndroidOsmWebMapHandle, Props>(function AndroidOsmWebMap(
  {
    initialRegion,
    overlays,
    isDark = false,
    scrollEnabled = true,
    zoomEnabled = true,
    minZoomLevel,
    maxZoomLevel,
    showsUserLocation = false,
    userLocation = null,
    onMapReady,
    onMapLoaded,
    onRegionChangeComplete,
    onPress,
    onLongPress,
  },
  ref,
) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const markerCallbacks = useRef(new Map<string, MarkerCallbacks>());

  const serializableOverlays = useMemo(() => {
    const next = new Map<string, MarkerCallbacks>();
    const markers = overlays.markers.map((marker) => {
      next.set(marker.id, { onPress: marker.onPress, onDragEnd: marker.onDragEnd });
      return {
        id: marker.id,
        latitude: marker.latitude,
        longitude: marker.longitude,
        pinColor: marker.pinColor,
        iconKind: marker.iconKind,
        iconColor: marker.iconColor,
        label: marker.label,
        size: marker.size,
        highlighted: marker.highlighted,
        opacity: marker.opacity,
        title: marker.title,
        showLabel: marker.showLabel,
        draggable: marker.draggable,
      };
    });
    markerCallbacks.current = next;
    return { markers, polylines: overlays.polylines };
  }, [overlays]);

  const overlaysKey = useMemo(() => JSON.stringify(serializableOverlays), [serializableOverlays]);
  const regionKey = useMemo(() => JSON.stringify(initialRegion), [initialRegion]);
  const optionsKey = useMemo(
    () =>
      JSON.stringify({
        isDark,
        scrollEnabled,
        zoomEnabled,
        minZoom: minZoomLevel,
        maxZoom: maxZoomLevel,
        showsUserLocation,
        userLocation,
      }),
    [isDark, maxZoomLevel, minZoomLevel, scrollEnabled, showsUserLocation, userLocation, zoomEnabled],
  );

  // Build the HTML once with the first resolved config. Keeping it stable across
  // re-renders is what prevents the WebView from reloading (the old "flashing").
  const htmlRef = useRef<string | null>(null);
  if (htmlRef.current === null) {
    const initialConfig: LeafletMapConfig = {
      region: initialRegion,
      overlays: serializableOverlays,
      isDark,
      scrollEnabled,
      zoomEnabled,
      minZoom: minZoomLevel,
      maxZoom: maxZoomLevel,
      showsUserLocation,
      userLocation,
    };
    htmlRef.current = leafletMapHtml(initialConfig);
  }

  const inject = useCallback((script: string) => {
    if (!webRef.current) {
      return;
    }
    webRef.current.injectJavaScript(`${script};true;`);
  }, []);

  const sendOverlayUpdate = useCallback(() => {
    if (!readyRef.current) {
      return;
    }
    inject(`window.__mapBridge&&window.__mapBridge.updateOverlays(${escapeForInject(serializableOverlays)})`);
  }, [inject, serializableOverlays]);

  const sendOptionsUpdate = useCallback(() => {
    if (!readyRef.current) {
      return;
    }
    const options = {
      isDark,
      scrollEnabled,
      zoomEnabled,
      minZoom: minZoomLevel,
      maxZoom: maxZoomLevel,
      showsUserLocation,
      userLocation,
    };
    inject(`window.__mapBridge&&window.__mapBridge.updateOptions(${escapeForInject(options)})`);
  }, [inject, isDark, maxZoomLevel, minZoomLevel, scrollEnabled, showsUserLocation, userLocation, zoomEnabled]);

  // `initialRegion` is captured once for the frozen HTML build above (so the
  // WebView never reloads), but the prop keeps flowing live — geometry that
  // resolves after mount (a late leg, a direction swap) reaches the map
  // through this channel instead of being stuck on the boot-time region.
  // Read through a ref so this callback stays STABLE. Depending on the region
  // object directly made it a new function on every render, which defeated the
  // `regionKey` memo below: a caller passing an inline `initialRegion` object
  // then pushed a region sync — and an animated re-fit — on every single render.
  const regionRef = useRef(initialRegion);
  regionRef.current = initialRegion;

  const sendRegionUpdate = useCallback(() => {
    if (!readyRef.current) {
      return;
    }
    inject(`window.__mapBridge&&window.__mapBridge.applyRegion(${escapeForInject(regionRef.current)},true)`);
  }, [inject]);

  const markReady = useCallback(() => {
    if (readyRef.current) {
      return;
    }
    readyRef.current = true;
    sendOverlayUpdate();
    sendOptionsUpdate();
    sendRegionUpdate();
    onMapReady?.({ nativeEvent: null } as unknown as Parameters<NonNullable<MapViewProps['onMapReady']>>[0]);
    onMapLoaded?.({ nativeEvent: null } as unknown as Parameters<NonNullable<MapViewProps['onMapLoaded']>>[0]);
  }, [onMapLoaded, onMapReady, sendOptionsUpdate, sendOverlayUpdate, sendRegionUpdate]);

  // Push incremental overlay/option/region changes after the map is live.
  useEffect(() => {
    if (!readyRef.current) {
      return;
    }
    sendOverlayUpdate();
    sendOptionsUpdate();
  }, [overlaysKey, optionsKey, sendOptionsUpdate, sendOverlayUpdate]);

  useEffect(() => {
    if (!readyRef.current) {
      return;
    }
    sendRegionUpdate();
  }, [regionKey, sendRegionUpdate]);

  // Safety net: never let the spinner hang if the WebView goes silent.
  useEffect(() => {
    const id = setTimeout(() => markReady(), READY_WATCHDOG_MS);
    return () => clearTimeout(id);
  }, [markReady]);

  useImperativeHandle(
    ref,
    () => ({
      animateToRegion: (nextRegion, duration = 300) => {
        inject(
          `window.__mapBridge&&window.__mapBridge.flyTo(${escapeForInject(nextRegion)},${Number(duration) || 300})`,
        );
      },
      fitToCoordinates: (coordinates, options) => {
        const padding = options?.edgePadding ?? { top: 0, right: 0, bottom: 0, left: 0 };
        inject(
          `window.__mapBridge&&window.__mapBridge.fitBounds(${escapeForInject(coordinates)},${escapeForInject(padding)})`,
        );
      },
    }),
    [inject],
  );

  const onMessage = (event: WebViewMessageEvent) => {
    let payload: {
      type: string;
      region?: Region;
      latitude?: number;
      longitude?: number;
      id?: string;
    };
    try {
      payload = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (payload.type === 'ready' || payload.type === 'error') {
      markReady();
      return;
    }

    if (payload.type === 'regionChange' && payload.region) {
      onRegionChangeComplete?.(payload.region, { isGesture: true });
      return;
    }

    if (payload.type === 'press' && payload.latitude != null && payload.longitude != null) {
      onPress?.({
        nativeEvent: {
          coordinate: { latitude: payload.latitude, longitude: payload.longitude },
          position: { x: 0, y: 0 },
        },
      } as Parameters<NonNullable<MapViewProps['onPress']>>[0]);
      return;
    }

    if (payload.type === 'longPress' && payload.latitude != null && payload.longitude != null) {
      onLongPress?.({
        nativeEvent: {
          coordinate: { latitude: payload.latitude, longitude: payload.longitude },
          position: { x: 0, y: 0 },
        },
      } as Parameters<NonNullable<MapViewProps['onLongPress']>>[0]);
      return;
    }

    if (payload.type === 'markerPress' && payload.id) {
      markerCallbacks.current.get(payload.id)?.onPress?.();
      return;
    }

    if (payload.type === 'markerDragEnd' && payload.id && payload.latitude != null && payload.longitude != null) {
      markerCallbacks.current.get(payload.id)?.onDragEnd?.({
        latitude: payload.latitude,
        longitude: payload.longitude,
      });
    }
  };

  return (
    <WebView
      ref={webRef}
      style={StyleSheet.absoluteFill}
      originWhitelist={['*']}
      source={{ html: htmlRef.current, baseUrl: 'https://localhost' }}
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      setSupportMultipleWindows={false}
      allowsInlineMediaPlayback
      mixedContentMode="always"
      androidLayerType="hardware"
    />
  );
});
