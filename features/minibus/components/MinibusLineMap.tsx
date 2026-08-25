import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  type ElementRef,
} from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Polyline } from 'react-native-maps';
import { useTranslation } from 'react-i18next';

import { OsmMapView } from '@/components/OsmMapView';
import { MinibusStopMarker } from '@/features/minibus/components/MinibusStopMarker';
import { minibusStopMarkerOverlay } from '@/features/minibus/lib/minibus-stop-marker-overlay';
import {
  fitRegionForCoordinates,
  lineMapStops,
  lineRoutePolyline,
  normalizeMapHighlightKey,
  stopCoordinate,
} from '@/features/minibus/stopCoordinates';
import { coordinateToRegion } from '@/lib/island-map';
import type { MapOverlaySpec } from '@/lib/map-overlays';
import { radius, space, typography } from '@/lib/tokens';
import type { MinibusNetworkStop, MinibusRouteShape } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

const MAP_HEIGHT = 240;
const FOCUS_DELTA = 0.006;

export type MinibusLineMapHandle = {
  focusStop: (stopKey: string) => void;
};

type Props = {
  stops: MinibusNetworkStop[];
  lineColor: string | null;
  lineCode: string;
  routeShapes?: MinibusRouteShape[] | null;
  highlightedStopKey?: string | null;
};

export const MinibusLineMap = forwardRef<MinibusLineMapHandle, Props>(function MinibusLineMap(
  { stops, lineColor, lineCode, routeShapes = null, highlightedStopKey = null },
  ref,
) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const strokeColor = lineColor ?? theme.primary;
  const mapRef = useRef<ElementRef<typeof OsmMapView>>(null);

  const mapStops = useMemo(() => lineMapStops(stops), [stops]);
  const mapHighlightKey = useMemo(
    () => normalizeMapHighlightKey(highlightedStopKey, stops),
    [highlightedStopKey, stops],
  );

  const coordinates = useMemo(() => lineRoutePolyline(stops, routeShapes), [routeShapes, stops]);
  const region = useMemo(() => fitRegionForCoordinates(coordinates), [coordinates]);

  const androidOverlays = useMemo((): MapOverlaySpec => {
    return {
      markers: mapStops
        .map((stop) =>
          minibusStopMarkerOverlay(stop, strokeColor, stop.key === mapHighlightKey),
        )
        .filter((marker): marker is NonNullable<typeof marker> => marker !== null),
      polylines:
        coordinates.length > 1
          ? [
              {
                id: `line-${lineCode}`,
                coordinates,
                strokeColor,
                strokeWidth: 4,
              },
            ]
          : [],
    };
  }, [coordinates, lineCode, mapHighlightKey, mapStops, strokeColor]);

  useImperativeHandle(ref, () => ({
    focusStop(stopKey: string) {
      const stop = stops.find((row) => row.key === stopKey);
      const coord = stop ? stopCoordinate(stop) : null;
      if (!coord) {
        return;
      }
      mapRef.current?.animateToRegion(
        coordinateToRegion({ lat: coord.latitude, lng: coord.longitude }, FOCUS_DELTA),
        350,
      );
    },
  }));

  if (!coordinates.length) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={[typography.headline, { color: theme.text, marginBottom: space.sm }]}>
        {t('minibusLineMap')}
      </Text>
      <View
        style={[
          styles.mapFrame,
          highlightedStopKey ? styles.mapFrameHighlighted : null,
          { borderColor: highlightedStopKey ? strokeColor : theme.outline },
        ]}
      >
        <OsmMapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          scrollEnabled
          zoomEnabled
          androidOverlays={androidOverlays}
          accessibilityLabel={t('minibusLineMapA11y', { line: lineCode })}
        >
          <Polyline coordinates={coordinates} strokeColor={strokeColor} strokeWidth={4} />
          {Platform.OS === 'ios'
            ? mapStops.map((stop) => (
                <MinibusStopMarker
                  key={stop.key}
                  stop={stop}
                  lineColor={strokeColor}
                  highlighted={stop.key === mapHighlightKey}
                />
              ))
            : null}
        </OsmMapView>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginTop: space.lg },
  mapFrame: {
    height: MAP_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  mapFrameHighlighted: {
    borderWidth: 2,
  },
  map: { flex: 1 },
});
