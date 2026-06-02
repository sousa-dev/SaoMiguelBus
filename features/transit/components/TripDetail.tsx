import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/lib/theme';
import type { TransitSearchResult } from '@/lib/types';

export function TripDetail({ trip }: { trip: TransitSearchResult | null }) {
  const theme = useAppTheme();
  if (!trip) {
    return null;
  }

  return (
    <View style={[styles.box, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.primary }]}>
        {trip.route} · {trip.origin} → {trip.destination}
      </Text>
      <View style={styles.stops}>
        {trip.stops.map((stop, index) => (
          <View key={`${stop.name}-${index}`} style={styles.row}>
            <Text style={{ color: theme.text, flex: 1 }}>{stop.name}</Text>
            <Text style={{ color: theme.muted }}>{stop.time}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 16, borderWidth: 1, borderRadius: 12, padding: 14 },
  title: { fontWeight: '700', marginBottom: 10 },
  stops: {},
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
});
