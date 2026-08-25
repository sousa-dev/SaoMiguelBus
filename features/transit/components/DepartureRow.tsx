import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { displayRouteNumber } from '@/lib/transit-format';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { TransitStopDeparture } from '@/lib/types';

type Props = {
  departure: TransitStopDeparture;
  /** Shown when the departure carries no destination — legacy rows. */
  fallbackDestination: string;
  onPress: () => void;
};

/** One row in a departures list: route badge, destination, time. Shared by the stop page and the trip detail page's "other departures" list so both behave identically. */
export function DepartureRow({ departure, fallbackDestination, onPress }: Props) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.departure, { borderBottomColor: theme.border }]}>
      <View style={[styles.routeBadge, { backgroundColor: theme.primary }]}>
        <Text style={[typography.caption, { color: theme.onPrimary, fontWeight: '700' }]}>
          {displayRouteNumber(departure.route)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.body, { color: theme.text }]} numberOfLines={1}>
          {departure.destination || fallbackDestination}
        </Text>
        {departure.code ? (
          <Text style={[typography.caption, { color: theme.muted }]}>{departure.code}</Text>
        ) : null}
      </View>
      <Text style={[typography.label, { color: theme.text }]}>
        {departure.time}
        {departure.dayOffset > 0 ? ' +1' : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  departure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  routeBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    minWidth: 38,
    alignItems: 'center',
  },
});
