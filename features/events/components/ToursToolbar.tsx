import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { SearchField } from '@/components/ui/SearchField';
import { Sheet } from '@/components/ui/Sheet';
import {
  EMPTY_TOUR_FILTERS,
  countActiveTourFilters,
  hasActiveTourFilters,
  TOUR_DURATION_OPTIONS,
  TOUR_PRICE_OPTIONS,
  TOUR_RATING_OPTIONS,
  TOUR_SORT_OPTIONS,
  type TourDurationRangeKey,
  type TourListFilters,
  type TourPriceRangeKey,
  type TourRatingFilterKey,
  type TourSortKey,
} from '@/features/events/filterHelpers';
import { trackTourFilter } from '@/features/events/hooks/useTourQueries';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

function sortLabelKey(sort: TourSortKey): string {
  switch (sort) {
    case 'featured':
      return 'toursSortFeatured';
    case 'priceLow':
      return 'toursSortPriceLow';
    case 'priceHigh':
      return 'toursSortPriceHigh';
    case 'rating':
      return 'toursSortRating';
    case 'durationShort':
      return 'toursSortDurationShort';
    case 'durationLong':
      return 'toursSortDurationLong';
  }
}

function ratingLabelKey(rating: TourRatingFilterKey): string {
  if (rating === '4') {
    return 'toursRating4Plus';
  }
  if (rating === '4.5') {
    return 'toursRating45Plus';
  }
  return 'toursFilterAll';
}

function priceLabelKey(price: TourPriceRangeKey): string {
  if (price === 'budget') {
    return 'toursPriceBudget';
  }
  if (price === 'mid') {
    return 'toursPriceMid';
  }
  if (price === 'premium') {
    return 'toursPricePremium';
  }
  return 'toursFilterAll';
}

function durationLabelKey(duration: TourDurationRangeKey): string {
  if (duration === 'short') {
    return 'toursDurationShort';
  }
  if (duration === 'halfDay') {
    return 'toursDurationHalfDay';
  }
  if (duration === 'fullDay') {
    return 'toursDurationFullDay';
  }
  return 'toursFilterAll';
}

export function ToursToolbar({
  filters,
  onChange,
  onClear,
}: {
  filters: TourListFilters;
  onChange: (next: TourListFilters) => void;
  onClear: () => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const activeCount = countActiveTourFilters(filters);
  const hasActive = hasActiveTourFilters(filters);

  const commit = (next: TourListFilters) => {
    onChange(next);
    trackTourFilter(next);
  };

  const openSheet = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setOpen(true);
  };

  return (
    <View style={styles.wrap}>
      <SearchField
        value={filters.query}
        onChangeText={(query) => onChange({ ...filters, query })}
        placeholder={t('toursSearchPlaceholder')}
        accessibilityLabel={t('toursSearchPlaceholder')}
      />

      <View style={styles.triggerRow}>
        {hasActive ? (
          <Button
            label={t('toursFilterClear')}
            variant="ghost"
            size="sm"
            onPress={onClear}
          />
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('toursFiltersButton')}
          onPress={openSheet}
          style={({ pressed }) => [
            styles.trigger,
            {
              backgroundColor: hasActive ? theme.primary : theme.surfaceVariant,
              borderColor: hasActive ? theme.primary : theme.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <SlidersHorizontal
            size={iconSize.sm}
            color={hasActive ? theme.onPrimary : theme.muted}
            strokeWidth={2}
          />
          <Text
            style={[
              typography.label,
              { color: hasActive ? theme.onPrimary : theme.text },
            ]}
          >
            {t('toursFiltersButton')}
          </Text>
          {activeCount > 0 ? (
            <View style={[styles.count, { backgroundColor: hasActive ? theme.onPrimary : theme.primary }]}>
              <Text style={[typography.caption, styles.countText, { color: hasActive ? theme.primary : theme.onPrimary }]}>
                {activeCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('toursFiltersTitle')}>
        <View style={styles.sheetBody}>
          <Text style={[typography.overline, styles.groupLabel, { color: theme.muted }]}>
            {t('toursFilterSort')}
          </Text>
          <View style={styles.chips}>
            {TOUR_SORT_OPTIONS.map((sort) => (
              <Chip
                key={sort}
                label={t(sortLabelKey(sort))}
                selected={filters.sort === sort}
                onPress={() => commit({ ...filters, sort })}
              />
            ))}
          </View>

          <Text style={[typography.overline, styles.groupLabel, { color: theme.muted }]}>
            {t('toursFilterRating')}
          </Text>
          <View style={styles.chips}>
            {TOUR_RATING_OPTIONS.map((rating) => (
              <Chip
                key={rating}
                label={t(ratingLabelKey(rating))}
                selected={filters.rating === rating}
                onPress={() => commit({ ...filters, rating })}
              />
            ))}
          </View>

          <Text style={[typography.overline, styles.groupLabel, { color: theme.muted }]}>
            {t('toursFilterPrice')}
          </Text>
          <View style={styles.chips}>
            {TOUR_PRICE_OPTIONS.map((price) => (
              <Chip
                key={price}
                label={t(priceLabelKey(price))}
                selected={filters.price === price}
                onPress={() => commit({ ...filters, price })}
              />
            ))}
          </View>

          <Text style={[typography.overline, styles.groupLabel, { color: theme.muted }]}>
            {t('toursFilterDuration')}
          </Text>
          <View style={styles.chips}>
            {TOUR_DURATION_OPTIONS.map((duration) => (
              <Chip
                key={duration}
                label={t(durationLabelKey(duration))}
                selected={filters.duration === duration}
                onPress={() => commit({ ...filters, duration })}
              />
            ))}
          </View>

          <View style={styles.sheetActions}>
            {hasActive ? (
              <Button
                label={t('toursFilterClear')}
                variant="outline"
                size="md"
                onPress={onClear}
                style={styles.actionBtn}
              />
            ) : null}
            <Button
              label={t('toursFiltersApply')}
              size="md"
              onPress={() => setOpen(false)}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </Sheet>
    </View>
  );
}

export { EMPTY_TOUR_FILTERS };

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  triggerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space.sm },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  count: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countText: { fontWeight: '700' },
  sheetBody: { paddingHorizontal: space.lg },
  groupLabel: { marginTop: space.md, marginBottom: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  sheetActions: { flexDirection: 'row', gap: space.sm, marginTop: space.xl },
  actionBtn: { flex: 1 },
});
