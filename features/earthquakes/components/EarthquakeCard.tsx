import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { SeismicEvent } from '@/lib/types';
import type { AppTheme } from '@/lib/theme';

export function EarthquakeCard({
  event,
  theme,
  onPress,
}: {
  event: SeismicEvent;
  theme: AppTheme;
  onPress: () => void;
}) {
  const when = new Date(event.occurredAt).toLocaleString();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <Text style={[styles.mag, { color: theme.primary }]}>M{event.magnitude.toFixed(1)}</Text>
      <Text style={[styles.region, { color: theme.text }]} numberOfLines={2}>
        {event.region || '—'}
      </Text>
      <Text style={{ color: theme.muted, fontSize: 12, marginTop: 6 }}>{when}</Text>
      {event.feltCount ? (
        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>
          {event.feltCount} felt
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  mag: { fontSize: 22, fontWeight: '800' },
  region: { fontSize: 15, fontWeight: '600', marginTop: 4 },
});
