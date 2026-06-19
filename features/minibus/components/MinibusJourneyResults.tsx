import React, { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdBanner } from '@/features/ads/components/AdBanner';
import { MinibusJourneyCard } from '@/features/minibus/components/MinibusJourneyCard';
import { space } from '@/lib/tokens';
import type { MinibusJourney, MinibusLine } from '@/lib/types';

type Props = {
  journeys: MinibusJourney[];
  linesByCode: Map<string, MinibusLine>;
};

export function MinibusJourneyResults({ journeys, linesByCode }: Props) {
  if (journeys.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {journeys.map((journey, index) => {
        const showInlineAd = (index + 1) % 2 === 0 && index < journeys.length - 1;
        return (
          <Fragment key={`journey-${index}`}>
            <MinibusJourneyCard journey={journey} linesByCode={linesByCode} />
            {showInlineAd ? <AdBanner on="home" slot={`minibus-search-inline-${index}`} /> : null}
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md, marginTop: space.sm },
});
