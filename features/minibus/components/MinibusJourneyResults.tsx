import React, { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdBanner } from '@/features/ads/components/AdBanner';
import { MinibusJourneyCard } from '@/features/minibus/components/MinibusJourneyCard';
import { space } from '@/lib/tokens';
import type { MinibusJourney, MinibusLine } from '@/lib/types';

type Props = {
  journeys: MinibusJourney[];
  linesByCode: Map<string, MinibusLine>;
  onJourneyPress?: (journey: MinibusJourney, journeyIndex: number) => void;
};

export function MinibusJourneyResults({ journeys, linesByCode, onJourneyPress }: Props) {
  if (journeys.length === 0) {
    return null;
  }

  // Same native-ad rule as the transit results (`RouteResults`): one after
  // every 2nd card, never after the last. The rule first fires at index 1, so
  // fewer than 3 journeys would render no ad at all — a results list always
  // carries at least one native ad; short lists take it at the end.
  const hasInlineAd = journeys.length >= 3;

  return (
    <View style={styles.wrap}>
      {journeys.map((journey, index) => {
        const showInlineAd = (index + 1) % 2 === 0 && index < journeys.length - 1;
        return (
          <Fragment key={`journey-${index}`}>
            <MinibusJourneyCard
              journey={journey}
              linesByCode={linesByCode}
              onPress={onJourneyPress ? () => onJourneyPress(journey, index) : undefined}
            />
            {showInlineAd ? (
              <AdBanner on="home" slot={`inline-${index}`} format="native" />
            ) : null}
          </Fragment>
        );
      })}
      {!hasInlineAd ? <AdBanner on="home" slot="inline-end" format="native" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md, marginTop: space.sm },
});
