import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { markerSizeForMagnitude } from '@/lib/island-map';
import { seismicEventHeadline } from '@/lib/seismic-display';
import { useTranslation } from 'react-i18next';
import { onColorFor } from '@/lib/color-utils';
import { magnitudeColor } from '@/lib/seismic-colors';
import { elevation } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { SeismicEvent } from '@/lib/types';

type Props = {
  event: SeismicEvent;
  onPress?: () => void;
};

export function SeismicMapMarker({ event, onPress }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const description = seismicEventHeadline(event, t) ?? undefined;
  const fill = magnitudeColor(theme, event.magnitude);
  const onFill = onColorFor(fill);
  const size = markerSizeForMagnitude(event.magnitude);

  return (
    <Marker
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      title={`M${event.magnitude.toFixed(1)}`}
      description={description}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View
        style={[
          styles.bubble,
          elevation(2, theme.text),
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: fill,
            borderColor: onFill,
          },
        ]}
      >
        <Text style={[styles.label, { fontSize: size < 36 ? 11 : 13, color: onFill }]}>
          {event.magnitude.toFixed(1)}
        </Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  label: { fontWeight: '800' },
});
