import React from 'react';
import { Marker, Polyline } from 'react-native-maps';

export type MapMarkerIconKind = 'default' | 'bus';

export type MapMarkerOverlay = {
  id: string;
  latitude: number;
  longitude: number;
  pinColor?: string;
  /** Android WebView pin glyph — bus renders a Lucide-style icon instead of label text. */
  iconKind?: MapMarkerIconKind;
  /** Foreground stroke/fill for iconKind glyphs (e.g. bus icon on line color). */
  iconColor?: string;
  /** Shown inside the pin circle (e.g. stop sequence). */
  label?: string;
  /** Pin diameter in px; defaults to 28 on Android WebView. */
  size?: number;
  /** 0–1 marker opacity on Android WebView. */
  opacity?: number;
  highlighted?: boolean;
  /**
   * A soft ring that expands and fades around the pin, looping (Android
   * WebView; real CSS `@keyframes`, not a static ring like `highlighted`).
   * Reserved for a single bus the rider is actually tracking.
   */
  pulsing?: boolean;
  title?: string;
  /** Paint `title` under the pin. Off by default — a title is a tap target's
   *  name, not a map label. */
  showLabel?: boolean;
  draggable?: boolean;
  onPress?: () => void;
  onDragEnd?: (coordinate: { latitude: number; longitude: number }) => void;
};

export type MapPolylineOverlay = {
  id: string;
  coordinates: { latitude: number; longitude: number }[];
  strokeColor?: string;
  strokeWidth?: number;
};

export type MapOverlaySpec = {
  markers: MapMarkerOverlay[];
  polylines: MapPolylineOverlay[];
};

/** Reads direct Marker / Polyline children (RouteMap, LocationPicker, marketplace). */
export function mapOverlaysFromChildren(children: React.ReactNode): MapOverlaySpec {
  const markers: MapMarkerOverlay[] = [];
  const polylines: MapPolylineOverlay[] = [];
  let markerIndex = 0;
  let polylineIndex = 0;

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) {
      return;
    }

    if (child.type === Marker) {
      const props = child.props as {
        coordinate?: { latitude: number; longitude: number };
        pinColor?: string;
        title?: string;
        draggable?: boolean;
        onPress?: () => void;
        onDragEnd?: (event: {
          nativeEvent: { coordinate: { latitude: number; longitude: number } };
        }) => void;
      };
      if (!props.coordinate) {
        return;
      }
      markers.push({
        id: `marker-${markerIndex}`,
        latitude: props.coordinate.latitude,
        longitude: props.coordinate.longitude,
        pinColor: props.pinColor,
        title: props.title,
        draggable: props.draggable,
        onPress: props.onPress,
        onDragEnd: props.onDragEnd
          ? (coordinate) => props.onDragEnd?.({ nativeEvent: { coordinate } })
          : undefined,
      });
      markerIndex += 1;
      return;
    }

    if (child.type === Polyline) {
      const props = child.props as {
        coordinates?: { latitude: number; longitude: number }[];
        strokeColor?: string;
        strokeWidth?: number;
      };
      if (!props.coordinates?.length) {
        return;
      }
      polylines.push({
        id: `polyline-${polylineIndex}`,
        coordinates: props.coordinates,
        strokeColor: props.strokeColor,
        strokeWidth: props.strokeWidth,
      });
      polylineIndex += 1;
    }
  });

  return { markers, polylines };
}

export function mergeMapOverlays(...specs: MapOverlaySpec[]): MapOverlaySpec {
  return {
    markers: specs.flatMap((spec) => spec.markers),
    polylines: specs.flatMap((spec) => spec.polylines),
  };
}
