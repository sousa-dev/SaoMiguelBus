import { Star } from 'lucide-react-native';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { TourSummary } from '@/lib/types';

function formatDuration(minutes: number | null): string | null {
  if (minutes == null || minutes <= 0) {
    return null;
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function TourCard({
  tour,
  onPress,
  fromPriceLabel,
  reviewsLabel,
}: {
  tour: TourSummary;
  onPress: () => void;
  fromPriceLabel: (price: number, currency: string) => string;
  reviewsLabel: (count: number) => string;
}) {
  const theme = useAppTheme();
  const duration = formatDuration(tour.durationMinutes);
  const hasRating = tour.rating != null && tour.rating > 0;

  return (
    <Card onPress={onPress} elevated style={styles.card} accessibilityLabel={tour.title}>
      {tour.thumbnailUrl ? (
        <Image source={{ uri: tour.thumbnailUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: theme.surfaceVariant }]} />
      )}
      <View style={styles.body}>
        <Text style={[typography.headline, { color: theme.text }]} numberOfLines={2}>
          {tour.title}
        </Text>
        <View style={styles.metaRow}>
          {hasRating ? (
            <View style={styles.ratingRow}>
              <Star size={iconSize.sm} color={theme.accent} fill={theme.accent} />
              <Text style={[typography.caption, { color: theme.muted }]}>
                {tour.rating!.toFixed(1)}
                {tour.reviewCount != null && tour.reviewCount > 0
                  ? ` · ${reviewsLabel(tour.reviewCount)}`
                  : ''}
              </Text>
            </View>
          ) : null}
          {duration ? (
            <Text style={[typography.caption, { color: theme.muted }]}>{duration}</Text>
          ) : null}
        </View>
        {tour.fromPrice != null ? (
          <View style={styles.priceBadge}>
            <Badge label={fromPriceLabel(tour.fromPrice, tour.currency)} tone="accent" />
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.md, padding: 0, overflow: 'hidden', borderRadius: radius.lg },
  image: { width: '100%', height: 160 },
  imagePlaceholder: { width: '100%', height: 160 },
  body: { padding: space.lg },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.sm,
    gap: space.sm,
    flexWrap: 'wrap',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceBadge: { marginTop: space.md },
});
