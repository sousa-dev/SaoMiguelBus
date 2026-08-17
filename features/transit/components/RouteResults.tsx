import React, { Fragment, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdBanner } from '@/features/ads/components/AdBanner';
import { FavoritesPanel } from '@/features/transit/components/FavoritesPanel';
import { JourneyCard } from '@/features/transit/components/JourneyCard';
import { RouteResultsToolbar } from '@/features/transit/components/RouteResultsToolbar';
import { space } from '@/lib/tokens';
import type { TransitJourney } from '@/lib/types';

type Props = {
  results: TransitJourney[];
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
        favoritesOpen={showFavorites}
        onToggleFavorites={() => setShowFavorites((open) => !open)}
      />
      {/* Closes on pick: it is a chooser, and leaving it open under results
          that have just changed leaves the rider looking at the thing they
          already used rather than at the answer. */}
      {showFavorites ? (
        <FavoritesPanel
          onSelect={(o, d) => {
            setShowFavorites(false);
            onFavoriteSelect(o, d);
          }}
        />
      ) : null}
      {results.map((journey, index) => {
        // Mirror the webapp: insert an inline ad after every 2 result cards
        // (never after the last one). Premium/offline users render nothing.
        const showInlineAd = (index + 1) % 2 === 0 && index < results.length - 1;
        return (
          <Fragment key={journey.id}>
            <JourneyCard journey={journey} searchDay={searchDay} />
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
