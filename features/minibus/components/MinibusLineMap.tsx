import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker, Polyline } from 'react-native-maps';
import { useTranslation } from 'react-i18next';

import { OsmMapView } from '@/components/OsmMapView';
import { fitRegionForCoordinates, linePolyline } from '@/features/minibus/stopCoordinates';
import { radius, space, typography } from '@/lib/tokens';
import type { MinibusNetworkStop } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

const MAP_HEIGHT = 240;

type Props = {
  stops: MinibusNetworkStop[];
  lineColor: string | null;
  lineCode: string;
};

export function MinibusLineMap({ stops, lineColor, lineCode }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const strokeColor = lineColor ?? theme.primary;

  const coordinates = useMemo(() => linePolyline(stops), [stops]);
  const region = useMemo(() => fitRegionForCoordinates(coordinates), [coordinates]);

  if (!coordinates.length) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={[typography.headline, { color: theme.text, marginBottom: space.sm }]}>
        {t('minibusLineMap')}
      </Text>
      <View style={[styles.mapFrame, { borderColor: theme.outline }]}>
        <OsmMapView
          style={styles.map}
          initialRegion={region}
          scrollEnabled
          zoomEnabled
          accessibilityLabel={t('minibusLineMapA11y', { line: lineCode })}
        >
          <Polyline coordinates={coordinates} strokeColor={strokeColor} strokeWidth={4} />
          {stops.map((stop) => {
            const lat = stop.latitude;
            const lng = stop.longitude;
            if (typeof lat !== 'number' || typeof lng !== 'number') {
              return null;
            }
            return (
              <Marker
                key={stop.key}
                coordinate={{ latitude: lat, longitude: lng }}
                title={`${stop.sequence}. ${stop.name_pt}`}
                pinColor={strokeColor}
              />
            );
          })}
        </OsmMapView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.lg },
  mapFrame: {
    height: MAP_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  map: { flex: 1 },
});
