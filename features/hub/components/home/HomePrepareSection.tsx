import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import type { HomeData } from '@/features/hub/hooks/useHomeData';
import { getSessionTourSuggestion, getSessionTrailSuggestion } from '@/features/hub/home-session-picks';
import { TrailThumb } from '@/features/trails/components/TrailThumb';
import type { TrailSummary } from '@/features/trails/types';
import { withAlpha } from '@/lib/color-utils';
import { getModule } from '@/lib/modules';
import type { ModuleKey } from '@/config/island';
import type { TourSummary } from '@/lib/types';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export function HomePrepareSection({
  tours,
  trails,
}: {
  tours: HomeData['tours'];
  trails: HomeData['trails'];
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const tourSuggestion = getSessionTourSuggestion(tours.tours);
  const trailSuggestion = getSessionTrailSuggestion(trails.trails);

  return (
    <View style={styles.wrap}>
      <Text style={[typography.headline, { color: theme.onSurface, marginBottom: space.sm }]}>
        {t('homePrepareTitle')}
      </Text>
      <View style={styles.row}>
        {tours.enabled ? (
          <View style={styles.cell}>
            <PrepareSuggestionTile
              moduleKey="events"
              sectionLabel={t('homeExperiencesLabel')}
              tour={tourSuggestion}
              listRoute="/tours"
            />
          </View>
        ) : null}
        {trails.enabled ? (
          <View style={styles.cell}>
            <PrepareSuggestionTile
              moduleKey="trails"
              sectionLabel={t('homeTrailsLabel')}
              trail={trailSuggestion}
              listRoute="/trails"
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function PrepareSuggestionTile({
  moduleKey,
  sectionLabel,
  tour,
  trail,
  listRoute,
}: {
  moduleKey: ModuleKey;
  sectionLabel: string;
  tour?: TourSummary | null;
  trail?: TrailSummary | null;
  listRoute: '/tours' | '/trails';
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const mod = getModule(moduleKey);
  const accent = mod?.accent ?? theme.primary;
  const Icon = mod?.Icon;
  const title = tour?.title ?? trail?.name;
  const hasSuggestion = Boolean(tour ?? trail);

  const onPress = () => {
    if (tour) {
      router.push({
        pathname: '/(tabs)/tours/[tourId]',
        params: { tourId: tour.code, fromHub: '1' },
      });
      return;
    }
    if (trail) {
      router.push({
        pathname: '/(tabs)/trails/[id]',
        params: { id: String(trail.id), fromHub: '1' },
      });
      return;
    }
    router.push(listRoute);
  };

  const meta = tour
    ? tour.fromPrice != null
      ? t('tourFromPrice', { price: tour.fromPrice.toFixed(0), currency: tour.currency })
      : null
    : trail?.distanceKm != null
      ? t('trailsDistance', { km: trail.distanceKm.toFixed(1) })
      : null;

  return (
    <Card onPress={onPress} accessibilityLabel={title ?? sectionLabel} style={styles.tile}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        {Icon ? (
          <View style={[styles.iconChip, { backgroundColor: withAlpha(accent, 0.12) }]}>
            <Icon size={iconSize.sm} color={accent} strokeWidth={2} />
          </View>
        ) : null}
        <Text style={[typography.caption, { color: theme.onSurfaceMuted, flex: 1 }]} numberOfLines={1}>
          {sectionLabel}
        </Text>
      </View>

      {hasSuggestion ? (
        <>
          <View style={styles.media}>
            {tour?.thumbnailUrl ? (
              <Image source={{ uri: tour.thumbnailUrl }} style={styles.image} resizeMode="cover" />
            ) : trail ? (
              <TrailThumb uri={trail.mapImageUrl} theme={theme} iconSize={28} style={styles.image} />
            ) : (
              <View style={[styles.image, { backgroundColor: theme.surfaceVariant }]} />
            )}
          </View>
          <View style={styles.footer}>
            <Text style={[typography.label, { color: theme.onSurface }]} numberOfLines={2}>
              {title}
            </Text>
            {meta ? (
              <Text style={[typography.caption, { color: theme.onSurfaceMuted, marginTop: space.xs }]} numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </View>
        </>
      ) : (
        <View style={styles.fallback}>
          {Icon ? (
            <View style={[styles.iconLarge, { backgroundColor: withAlpha(accent, 0.12) }]}>
              <Icon size={iconSize.lg} color={accent} strokeWidth={2} />
            </View>
          ) : null}
          <Text style={[typography.caption, { color: theme.onSurfaceMuted, textAlign: 'center' }]}>
            {t('homeSuggestionBrowse')}
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  row: {
    flexDirection: 'row',
    gap: space.md,
    width: '100%',
  },
  cell: {
    flex: 1,
    minWidth: 0,
  },
  tile: {
    flex: 1,
    width: '100%',
    aspectRatio: 1,
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconChip: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  media: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  footer: {
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.md,
    gap: space.sm,
  },
  iconLarge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
