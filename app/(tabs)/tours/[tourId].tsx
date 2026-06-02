import { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Check, Clock, ExternalLink, Star } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StateView';
import { trackTourBookClick, trackTourOpen, useTour } from '@/features/events/hooks/useTourQueries';
import { VIATOR_FALLBACK_URL, openViatorExternal } from '@/features/events/viator';
import { useNetworkStatus } from '@/lib/network-status';
import { iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatDuration(
  minutes: number | null,
  t: (key: string, opts?: Record<string, string | number>) => string,
): string | null {
  if (minutes == null || minutes <= 0) {
    return null;
  }
  if (minutes < 60) {
    return t('tourDurationMinutes', { minutes });
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0
    ? t('tourDurationHoursMinutes', { hours, minutes: mins })
    : t('tourDurationHours', { hours });
}

export default function TourDetailScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const code = (tourId ?? '').trim();
  const tour = useTour(code, code.length > 0);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    if (tour.data) {
      trackTourOpen(tour.data.code, tour.data.title);
    }
  }, [tour.data?.code]);

  if (tour.isLoading) {
    return (
      <Screen withStackHeader>
        <View style={{ padding: space.lg }}>
          <CardSkeleton imageHeight={220} />
        </View>
      </Screen>
    );
  }

  if (!tour.data) {
    return (
      <Screen withStackHeader>
        <ErrorState
          title={t('tourNotFound')}
          actionLabel={t('toursBrowseAll')}
          onAction={() => openViatorExternal(VIATOR_FALLBACK_URL)}
        />
      </Screen>
    );
  }

  const data = tour.data;
  const images = [data.heroUrl, data.thumbnailUrl].filter(Boolean) as string[];
  const duration = formatDuration(data.durationMinutes, t);
  const priceLabel =
    data.fromPrice != null
      ? t('tourFromPrice', { price: data.fromPrice.toFixed(0), currency: data.currency })
      : t('tourBookCta');

  return (
    <Screen withStackHeader>
      <ScrollView contentContainerStyle={styles.scroll}>
        {images.length > 0 ? (
          <View>
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(uri, i) => `${uri}-${i}`}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setGalleryIndex(idx);
              }}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.hero} resizeMode="cover" />
              )}
            />
            {images.length > 1 ? (
              <View style={styles.dots}>
                {images.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      { backgroundColor: i === galleryIndex ? theme.primary : theme.outline },
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[styles.hero, { backgroundColor: theme.surfaceVariant }]} />
        )}

        <View style={styles.content}>
          <Text style={[typography.title, { color: theme.text }]}>{data.title}</Text>

          <View style={styles.facts}>
            {data.rating != null && data.rating > 0 ? (
              <View style={styles.fact}>
                <Star size={iconSize.md} color={theme.accent} fill={theme.accent} />
                <Text style={[typography.caption, { color: theme.muted }]}>
                  {data.rating.toFixed(1)}
                  {data.reviewCount ? ` · ${t('tourReviews', { count: data.reviewCount })}` : ''}
                </Text>
              </View>
            ) : null}
            {duration ? (
              <View style={styles.fact}>
                <Clock size={iconSize.md} color={theme.muted} />
                <Text style={[typography.caption, { color: theme.muted }]}>{duration}</Text>
              </View>
            ) : null}
            {data.fromPrice != null ? <Badge label={priceLabel} tone="accent" /> : null}
          </View>

          {data.flags.length > 0 ? (
            <View style={styles.highlights}>
              {data.flags.map((flag) => (
                <View key={flag} style={styles.highlightRow}>
                  <Check size={16} color={theme.primary} />
                  <Text style={[typography.body, { color: theme.text, flex: 1 }]}>
                    {flag.replace(/_/g, ' ')}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {data.description ? (
            <Text style={[typography.body, { color: theme.text, lineHeight: 24, marginTop: space.lg }]}>
              {data.description}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bookBar,
          {
            paddingBottom: space.md,
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
          },
        ]}
      >
        <Button
          label={`${t('tourBookCta')} · ${priceLabel}`}
          disabled={!isOnline}
          fullWidth
          onPress={() => {
            trackTourBookClick(data.code);
            openViatorExternal(data.bookingUrl);
          }}
        />
        <View style={styles.externalRow}>
          <ExternalLink size={14} color={theme.muted} />
          <Text style={[typography.caption, { color: theme.muted, marginLeft: 4 }]}>
            {t('toursBrowseAll')}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 96 },
  hero: { width: SCREEN_WIDTH, height: 240 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: space.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  content: { padding: space.lg },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md, alignItems: 'center' },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  highlights: { marginTop: space.lg, gap: space.sm },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bookBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  externalRow: { flexDirection: 'row', justifyContent: 'center', marginTop: space.xs },
});
