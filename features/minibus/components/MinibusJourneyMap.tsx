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
import { MinibusJourneyStepMarker } from '@/features/minibus/components/MinibusJourneyStepMarker';
import {
  buildJourneySteps,
  isJourneyMarkerHighlighted,
  journeyMapMarkers,
  journeyMarkerCoordinates,
  resolveJourneyMapMarker,
} from '@/features/minibus/journeySteps';
import { journeyStepMarkerOverlay } from '@/features/minibus/lib/journey-step-marker-overlay';
import {
  fitRegionForCoordinates,
  journeyHasMapCoordinates,
  journeyPolylines,
} from '@/features/minibus/stopCoordinates';
import { coordinateToRegion } from '@/lib/island-map';
import type { MapOverlaySpec } from '@/lib/map-overlays';
import { radius, space, typography } from '@/lib/tokens';
import type { MinibusJourney } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

const MAP_HEIGHT = 320;
const FOCUS_DELTA = 0.004;

export type MinibusJourneyMapHandle = {
  focusStep: (stepKey: string) => void;
};

type Props = {
  journey: MinibusJourney;
  highlightedStepKey?: string | null;
};

export const MinibusJourneyMap = forwardRef<MinibusJourneyMapHandle, Props>(function MinibusJourneyMap(
  { journey, highlightedStepKey = null },
  ref,
) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const mapRef = useRef<ElementRef<typeof OsmMapView>>(null);

  const steps = useMemo(() => buildJourneySteps(journey, t), [journey, t]);
  const markers = useMemo(() => journeyMapMarkers(steps), [steps]);
  const polylines = useMemo(() => journeyPolylines(journey), [journey]);
  const region = useMemo(
    () => fitRegionForCoordinates(journeyMarkerCoordinates(markers), 0.008),
    [markers],
  );

  const androidOverlays = useMemo((): MapOverlaySpec => {
    return {
      markers: markers.map((marker) =>
        journeyStepMarkerOverlay(
          marker,
          isJourneyMarkerHighlighted(marker, highlightedStepKey, steps),
        ),
      ),
      polylines: polylines.map((line) => ({
        id: line.id,
        coordinates: line.coordinates,
        strokeColor: line.color,
        strokeWidth: 5,
      })),
    };
  }, [highlightedStepKey, markers, polylines, steps]);

  useImperativeHandle(ref, () => ({
    focusStep(stepKey: string) {
      const marker = resolveJourneyMapMarker(markers, steps, stepKey);
      if (!marker) {
        return;
      }
      mapRef.current?.animateToRegion(
        coordinateToRegion(
          { lat: marker.coordinate.latitude, lng: marker.coordinate.longitude },
          FOCUS_DELTA,
        ),
        350,
      );
    },
  }));

  if (!journeyHasMapCoordinates(journey) || markers.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={[typography.headline, { color: theme.text, marginBottom: space.sm }]}>
        {t('minibusJourneyMapA11y')}
      </Text>
      <View
        style={[
          styles.mapFrame,
          highlightedStepKey ? styles.mapFrameHighlighted : null,
          { borderColor: highlightedStepKey ? theme.primary : theme.outline },
        ]}
      >
        <OsmMapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          scrollEnabled
          zoomEnabled
          androidOverlays={androidOverlays}
          accessibilityLabel={t('minibusJourneyMapA11y')}
        >
          {polylines.map((line) => (
            <Polyline
              key={line.id}
              coordinates={line.coordinates}
              strokeColor={line.color}
              strokeWidth={5}
            />
          ))}
          {Platform.OS === 'ios'
            ? markers.map((marker) => (
                <MinibusJourneyStepMarker
                  key={marker.id}
                  marker={marker}
                  highlighted={isJourneyMarkerHighlighted(marker, highlightedStepKey, steps)}
                />
              ))
            : null}
        </OsmMapView>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
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
