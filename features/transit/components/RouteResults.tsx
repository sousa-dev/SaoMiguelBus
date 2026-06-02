import { ThumbsDown, ThumbsUp } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { useTripVote } from '@/features/transit/hooks/useTransitQueries';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { TransitSearchResult } from '@/lib/types';

type Props = {
  results: TransitSearchResult[];
  onSelect: (trip: TransitSearchResult) => void;
  selectedId?: number;
};

export function RouteResults({ results, onSelect, selectedId }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const vote = useTripVote();
  const router = useRouter();

  if (results.length === 0) {
    return (
      <Text style={[typography.body, { color: theme.muted, marginTop: space.lg }]}>
        {t('noRoutesMessage', { origin: '—', destination: '—' })}
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {results.map((trip) => (
        <Card
          key={trip.id}
          onPress={() => {
            onSelect(trip);
            router.push({
              pathname: '/(tabs)/transit/[tripId]',
              params: { tripId: String(trip.id) },
            });
          }}
          style={[
            {
              borderColor: selectedId === trip.id ? theme.primary : theme.border,
              borderWidth: selectedId === trip.id ? 2 : StyleSheet.hairlineWidth,
            },
          ]}
        >
          <Text style={[typography.headline, { color: theme.primary }]}>{trip.route}</Text>
          <Text style={[typography.body, { color: theme.text }]}>
            {trip.start} → {trip.end}
          </Text>
          <Text style={[typography.caption, { color: theme.muted, marginTop: space.xs }]}>
            {t('transitLikePercent', { percent: trip.likesPercent })} ·{' '}
            {t('transitDislikePercent', { percent: trip.dislikesPercent })}
          </Text>
          <View style={styles.voteRow}>
            <IconButton
              icon={ThumbsUp}
              variant="tonal"
              accessibilityLabel={t('transitLikeAction')}
              onPress={() => vote.mutate({ tripId: trip.id, vote: 'like' })}
            />
            <IconButton
              icon={ThumbsDown}
              variant="tonal"
              accessibilityLabel={t('transitDislikeAction')}
              onPress={() => vote.mutate({ tripId: trip.id, vote: 'dislike' })}
            />
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: space.lg, gap: space.md },
  voteRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
});
