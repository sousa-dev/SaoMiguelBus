import React from 'react';
import { StyleSheet, View } from 'react-native';

import { RouteCard } from '@/features/transit/components/RouteCard';
import type { TransitSearchResult } from '@/lib/types';

type Props = {
  trip: TransitSearchResult | null;
  searchDay?: string;
};

export function TripDetail({ trip, searchDay = 'weekday' }: Props) {
  if (!trip) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <RouteCard trip={trip} searchDay={searchDay} expandedByDefault />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
});
