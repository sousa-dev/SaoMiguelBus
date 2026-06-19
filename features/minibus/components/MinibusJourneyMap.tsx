import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker, Polyline } from 'react-native-maps';
import { useTranslation } from 'react-i18next';

import { OsmMapView } from '@/components/OsmMapView';
import {
  allJourneyCoordinates,
  fitRegionForCoordinates,
  journeyPolylines,
  stopCoordinate,
} from '@/features/minibus/stopCoordinates';
import { radius, space } from '@/lib/tokens';
import type { MinibusJourney } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

const MAP_HEIGHT = 280;

type Props = {
  journey: MinibusJourney;
};

export function MinibusJourneyMap({ journey }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const polylines = useMemo(() => journeyPolylines(journey), [journey]);
  const region = useMemo(
    () => fitRegionForCoordinates(allJourneyCoordinates(journey)),
    [journey],
  );

  if (!polylines.length) {
    return null;
  }

  const boardCoord = stopCoordinate(journey.legs[0]?.board ?? { latitude: null, longitude: null });
  const finalLeg = journey.legs[journey.legs.length - 1];
  const alightCoord = finalLeg ? stopCoordinate(finalLeg.alight) : null;

  return (
    <View style={[styles.mapFrame, { borderColor: theme.outline }]}>
      <OsmMapView
        style={styles.map}
        initialRegion={region}
        scrollEnabled
        zoomEnabled
        accessibilityLabel={t('minibusJourneyMapA11y')}
      >
        {polylines.map((line) => (
          <Polyline
            key={line.id}
            coordinates={line.coordinates}
            strokeColor={line.color}
            strokeWidth={4}
          />
        ))}
        {boardCoord ? (
          <Marker coordinate={boardCoord} title={journey.legs[0]?.board.name} pinColor="#22c55e" />
        ) : null}
        {alightCoord ? (
          <Marker coordinate={alightCoord} title={finalLeg?.alight.name} pinColor="#ef4444" />
        ) : null}
      </OsmMapView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapFrame: {
    height: MAP_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: space.md,
  },
  map: { flex: 1 },
});
