import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import {
  activeDistanceRange,
  buildTrailListFilters,
  DISTANCE_RANGES,
  hasActiveTrailFilters,
} from '@/features/trails/filterHelpers';
import { trackTrailFilter, type TrailListFilters } from '@/features/trails/hooks/useTrailQueries';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const DIFFICULTIES = ['', 'easy', 'moderate', 'hard'] as const;
const SHAPES = ['', 'circular', 'linear'] as const;

function chipSelected(current: string | undefined, value: string): boolean {
  if (!value) {
    return current == null;
  }
  return current === value;
}

export function TrailFilters({
  filters,
  onChange,
  onClear,
}: {
  filters: TrailListFilters;
  onChange: (next: TrailListFilters) => void;
  onClear: () => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const commit = (next: TrailListFilters) => {
    onChange(next);
    trackTrailFilter(next);
  };

  const setDifficulty = (value: string) => {
    commit(buildTrailListFilters({ ...filters, difficulty: value || undefined }));
  };

  const setShape = (value: string) => {
    commit(buildTrailListFilters({ ...filters, shape: value || undefined }));
  };

  const setDistance = (minLength?: number, maxLength?: number) => {
    commit(
      buildTrailListFilters({
        difficulty: filters.difficulty,
        shape: filters.shape,
        minLength,
        maxLength,
      }),
    );
  };

  const selectedRange = activeDistanceRange(filters);
  const showClear = hasActiveTrailFilters(filters);

  return (
    <View style={styles.wrap}>
      <Text style={[typography.overline, styles.groupLabel, { color: theme.muted }]}>
        {t('trailsFilterDifficulty')}
      </Text>
      <View style={styles.chips}>
        {DIFFICULTIES.map((value) => (
          <Chip
            key={value || 'all-diff'}
            label={value ? t(`trailsDifficulty_${value}`, { defaultValue: value }) : t('trailsFilterAll')}
            selected={chipSelected(filters.difficulty, value)}
            onPress={() => setDifficulty(value)}
          />
        ))}
      </View>

      <Text style={[typography.overline, styles.groupLabel, { color: theme.muted }]}>
        {t('trailsFilterShape')}
      </Text>
      <View style={styles.chips}>
        {SHAPES.map((value) => (
          <Chip
            key={value || 'all-shape'}
            label={value ? t(`trailsShape_${value}`) : t('trailsFilterAll')}
            selected={chipSelected(filters.shape, value)}
            onPress={() => setShape(value)}
          />
        ))}
      </View>

      <Text style={[typography.overline, styles.groupLabel, { color: theme.muted }]}>
        {t('trailsFilterDistance')}
      </Text>
      <View style={styles.chips}>
        {DISTANCE_RANGES.map((range) => (
          <Chip
            key={range.key}
            label={range.key === 'all' ? t('trailsFilterAll') : t(`trailsDistance_${range.key}`)}
            selected={selectedRange === range.key}
            onPress={() => setDistance(range.minLength, range.maxLength)}
          />
        ))}
      </View>

      {showClear ? (
        <Button
          label={t('trailsFilterClear')}
          variant="outline"
          size="sm"
          onPress={onClear}
          style={styles.clear}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, paddingTop: space.sm, marginBottom: space.sm },
  groupLabel: { marginTop: space.sm, marginBottom: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  clear: { alignSelf: 'flex-start', marginTop: space.sm },
});
