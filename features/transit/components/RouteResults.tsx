import React, { Fragment, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdBanner } from '@/features/ads/components/AdBanner';
import { FavoritesPanel } from '@/features/transit/components/FavoritesPanel';
import { RouteCard } from '@/features/transit/components/RouteCard';
import { RouteResultsToolbar } from '@/features/transit/components/RouteResultsToolbar';
import { space } from '@/lib/tokens';
import type { TransitSearchResult } from '@/lib/types';

type Props = {
  results: TransitSearchResult[];
  searchDay: string;
  origin: string;
  destination: string;
  onFavoriteSelect: (origin: string, destination: string) => void;
};

export function RouteResults({ results, searchDay, origin, destination, onFavoriteSelect }: Props) {
  const [showFavorites, setShowFavorites] = useState(false);

  if (results.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <RouteResultsToolbar
        origin={origin}
        destination={destination}
        onShowFavorites={() => setShowFavorites(true)}
      />
      {showFavorites ? <FavoritesPanel onSelect={onFavoriteSelect} /> : null}
      {results.map((trip, index) => {
        // Mirror the webapp: insert an inline ad after every 2 result cards
        // (never after the last one). Premium/offline users render nothing.
        const showInlineAd = (index + 1) % 2 === 0 && index < results.length - 1;
        return (
          <Fragment key={trip.id}>
            <RouteCard trip={trip} searchDay={searchDay} />
            {showInlineAd ? <AdBanner on="home" slot={`inline-${index}`} /> : null}
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md, marginTop: space.sm },
});
