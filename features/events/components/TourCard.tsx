import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { TourSummary } from '@/lib/types';
import type { AppTheme } from '@/lib/theme';

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
  theme,
  onPress,
  fromPriceLabel,
  reviewsLabel,
}: {
  tour: TourSummary;
  theme: AppTheme;
  onPress: () => void;
  fromPriceLabel: (price: number, currency: string) => string;
  reviewsLabel: (count: number) => string;
}) {
  const duration = formatDuration(tour.durationMinutes);
  const hasRating = tour.rating != null && tour.rating > 0;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      {tour.thumbnailUrl ? (
        <Image source={{ uri: tour.thumbnailUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: theme.border }]} />
      )}
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {tour.title}
        </Text>
        <View style={styles.metaRow}>
          {hasRating ? (
            <Text style={{ color: theme.muted, fontSize: 13 }}>
              ★ {tour.rating!.toFixed(1)}
              {tour.reviewCount != null && tour.reviewCount > 0
                ? ` · ${reviewsLabel(tour.reviewCount)}`
                : ''}
            </Text>
          ) : null}
          {duration ? (
            <Text style={{ color: theme.muted, fontSize: 13 }}>{duration}</Text>
          ) : null}
        </View>
        {tour.fromPrice != null ? (
          <Text style={[styles.price, { color: theme.primary }]}>
            {fromPriceLabel(tour.fromPrice, tour.currency)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
  },
  imagePlaceholder: {
    width: '100%',
    height: 160,
  },
  body: {
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  price: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
  },
});
