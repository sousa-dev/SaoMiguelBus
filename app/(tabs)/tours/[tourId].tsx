import { useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { trackTourBookClick, trackTourOpen, useTour } from '@/features/events/hooks/useTourQueries';
import { useAppTheme } from '@/lib/theme';

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

function formatFlag(flag: string): string {
  return flag.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TourDetailScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const code = (tourId ?? '').trim();
  const tour = useTour(code, code.length > 0);

  useEffect(() => {
    if (tour.data) {
      trackTourOpen(tour.data.code, tour.data.title);
    }
  }, [tour.data?.code]);

  if (tour.isLoading) {
    return <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />;
  }

  if (!tour.data) {
    return <Text style={{ color: theme.muted, padding: 16 }}>{t('tourNotFound')}</Text>;
  }

  const data = tour.data;
  const hero = data.heroUrl || data.thumbnailUrl;
  const duration = formatDuration(data.durationMinutes, t);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {hero ? (
        <Image source={{ uri: hero }} style={styles.hero} resizeMode="cover" />
      ) : (
        <View style={[styles.heroPlaceholder, { backgroundColor: theme.border }]} />
      )}

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{data.title}</Text>

        <View style={styles.meta}>
          {data.rating != null && data.rating > 0 ? (
            <Text style={{ color: theme.muted }}>
              ★ {data.rating.toFixed(1)}
              {data.reviewCount != null && data.reviewCount > 0
                ? ` · ${t('tourReviews', { count: data.reviewCount })}`
                : ''}
            </Text>
          ) : null}
          {duration ? <Text style={{ color: theme.muted }}>{duration}</Text> : null}
        </View>

        {data.fromPrice != null ? (
          <Text style={[styles.price, { color: theme.primary }]}>
            {t('tourFromPrice', { price: data.fromPrice.toFixed(0), currency: data.currency })}
          </Text>
        ) : null}

        {data.flags.length > 0 ? (
          <View style={styles.flags}>
            {data.flags.map((flag) => (
              <Text
                key={flag}
                style={[styles.flag, { color: theme.secondary, borderColor: theme.border }]}
              >
                {formatFlag(flag)}
              </Text>
            ))}
          </View>
        ) : null}

        {data.description ? (
          <Text style={[styles.description, { color: theme.text }]}>{data.description}</Text>
        ) : null}

        <Pressable
          onPress={() => {
            trackTourBookClick(data.code);
            void WebBrowser.openBrowserAsync(data.bookingUrl);
          }}
          style={[styles.btn, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.btnText}>{t('tourBookCta')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { width: '100%', height: 220 },
  heroPlaceholder: { width: '100%', height: 220 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  price: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  flag: {
    fontSize: 12,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  description: { lineHeight: 22, marginBottom: 20 },
  btn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
