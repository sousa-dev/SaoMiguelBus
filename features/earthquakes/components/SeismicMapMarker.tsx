import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import {
  markerColorForMagnitude,
  markerSizeForMagnitude,
} from '@/lib/island-map';
import type { SeismicEvent } from '@/lib/types';

type Props = {
  event: SeismicEvent;
  onPress?: () => void;
};

export function SeismicMapMarker({ event, onPress }: Props) {
  const fill = markerColorForMagnitude(event.magnitude);
  const size = markerSizeForMagnitude(event.magnitude);

  return (
    <Marker
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      title={`M${event.magnitude.toFixed(1)}`}
      description={event.region || undefined}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View
        style={[
          styles.bubble,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: fill,
          },
        ]}
      >
        <Text style={[styles.label, { fontSize: size < 36 ? 11 : 13 }]}>
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
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  label: { color: '#fff', fontWeight: '800' },
});
