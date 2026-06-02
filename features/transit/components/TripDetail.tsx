import * as Haptics from 'expo-haptics';
import { Star, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { useTripVote } from '@/features/transit/hooks/useTransitQueries';
import { useFavoritesStore } from '@/lib/favorites-store';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { TransitSearchResult } from '@/lib/types';

export function TripDetail({ trip }: { trip: TransitSearchResult | null }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const vote = useTripVote();
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isFavorite = useFavoritesStore((s) => s.isFavorite);

  if (!trip) {
    return null;
  }

  const favorited = isFavorite(trip.origin, trip.destination);

  const onVote = (kind: 'like' | 'dislike') => {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    vote.mutate({ tripId: trip.id, vote: kind });
  };

  return (
    <View style={styles.wrap}>
      <Card elevated>
        <View style={styles.headerRow}>
          <Badge label={trip.route} tone="primary" />
          <IconButton
            icon={Star}
            accessibilityLabel={favorited ? t('removeFavorites') : t('addFavorites')}
            color={favorited ? theme.accent : theme.muted}
            onPress={() => toggleFavorite(trip.origin, trip.destination)}
          />
        </View>
        <Text style={[typography.headline, { color: theme.text, marginTop: space.md }]}>
          {trip.origin} → {trip.destination}
        </Text>
        <View style={styles.badgeRow}>
          <Badge label={`${trip.start} – ${trip.end}`} tone="neutral" />
          {trip.typeOfDay ? <Badge label={t(trip.typeOfDay)} tone="neutral" /> : null}
        </View>
      </Card>

      <Card style={styles.stopsCard}>
        {trip.stops.map((stop, index) => {
          const isEndpoint = index === 0 || index === trip.stops.length - 1;
          return (
            <View
              key={`${stop.name}-${index}`}
              style={[
                styles.stopRow,
                { borderBottomColor: theme.border },
                isEndpoint && { backgroundColor: theme.surfaceVariant },
              ]}
            >
              <View style={[styles.timelineDot, { backgroundColor: theme.primary }]} />
              <Text style={[typography.body, { color: theme.text, flex: 1 }]}>{stop.name}</Text>
              <Text style={[typography.label, { color: theme.muted, fontVariant: ['tabular-nums'] }]}>
                {stop.time}
              </Text>
            </View>
          );
        })}
      </Card>

      <Card>
        <Text style={[typography.caption, { color: theme.muted, marginBottom: space.md }]}>
          {t('transitLikePercent', { percent: trip.likesPercent })}
        </Text>
        <View style={styles.voteRow}>
          <IconButton
            icon={ThumbsUp}
            variant="tonal"
            color={theme.success}
            accessibilityLabel={t('transitLikeAction')}
            onPress={() => onVote('like')}
          />
          <IconButton
            icon={ThumbsDown}
            variant="tonal"
            color={theme.danger}
            accessibilityLabel={t('transitDislikeAction')}
            onPress={() => onVote('dislike')}
          />
          <Text style={[typography.caption, { color: theme.muted, alignSelf: 'center' }]}>
            {t('transitDislikePercent', { percent: trip.dislikesPercent })}
          </Text>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md, marginTop: space.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  stopsCard: { paddingVertical: 0, overflow: 'hidden' },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: space.md,
  },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },
  voteRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
});
