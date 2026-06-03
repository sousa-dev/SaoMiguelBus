import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import {
  buildTrailListFilters,
  hasActiveTrailFilters,
  parseLength,
} from '@/features/trails/filterHelpers';
import { trackTrailFilter, type TrailListFilters } from '@/features/trails/hooks/useTrailQueries';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const DIFFICULTIES = ['', 'easy', 'moderate', 'hard'] as const;
const SHAPES = ['', 'circular', 'linear'] as const;
const LENGTH_DEBOUNCE_MS = 400;

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
  const [minText, setMinText] = useState(
    filters.minLength != null ? String(filters.minLength) : '',
  );
  const [maxText, setMaxText] = useState(
    filters.maxLength != null ? String(filters.maxLength) : '',
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    setMinText(filters.minLength != null ? String(filters.minLength) : '');
    setMaxText(filters.maxLength != null ? String(filters.maxLength) : '');
  }, [filters.minLength, filters.maxLength]);

  const commitLengthFilters = (nextMin: string, nextMax: string) => {
    const next = buildTrailListFilters({
      difficulty: filtersRef.current.difficulty,
      shape: filtersRef.current.shape,
      minLength: parseLength(nextMin),
      maxLength: parseLength(nextMax),
    });
    onChange(next);
    trackTrailFilter(next);
  };

  const scheduleLengthCommit = (nextMin: string, nextMax: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      commitLengthFilters(nextMin, nextMax);
    }, LENGTH_DEBOUNCE_MS);
  };

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const setDifficulty = (value: string) => {
    const next = buildTrailListFilters({
      ...filters,
      difficulty: value || undefined,
    });
    onChange(next);
    trackTrailFilter(next);
  };

  const setShape = (value: string) => {
    const next = buildTrailListFilters({
      ...filters,
      shape: value || undefined,
    });
    onChange(next);
    trackTrailFilter(next);
  };

  const showClear = hasActiveTrailFilters(filters);

  return (
    <View style={styles.wrap}>
      <Text style={[typography.overline, { color: theme.muted }]}>{t('trailsFilterDifficulty')}</Text>
      <View style={styles.chips}>
        {DIFFICULTIES.map((value) => {
          const label = value ? t(`trailsDifficulty_${value}`, { defaultValue: value }) : t('trailsFilterAll');
          return (
            <Chip
              key={value || 'all-diff'}
              label={label}
              selected={chipSelected(filters.difficulty, value)}
              onPress={() => setDifficulty(value)}
            />
          );
        })}
      </View>

      <Text style={[typography.overline, { color: theme.muted, marginTop: space.sm }]}>
        {t('trailsFilterShape')}
      </Text>
      <View style={styles.chips}>
        {SHAPES.map((value) => {
          const label = value ? t(`trailsShape_${value}`) : t('trailsFilterAll');
          return (
            <Chip
              key={value || 'all-shape'}
              label={label}
              selected={chipSelected(filters.shape, value)}
              onPress={() => setShape(value)}
            />
          );
        })}
      </View>

      <View style={styles.lengthRow}>
        <Field
          value={minText}
          onChangeText={(text) => {
            setMinText(text);
            scheduleLengthCommit(text, maxText);
          }}
          placeholder={t('trailsFilterMinKm')}
          keyboardType="decimal-pad"
        />
        <Field
          value={maxText}
          onChangeText={(text) => {
            setMaxText(text);
            scheduleLengthCommit(minText, text);
          }}
          placeholder={t('trailsFilterMaxKm')}
          keyboardType="decimal-pad"
        />
      </View>

      {showClear ? (
        <Button label={t('trailsFilterClear')} variant="outline" onPress={onClear} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md, paddingHorizontal: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  lengthRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
});
