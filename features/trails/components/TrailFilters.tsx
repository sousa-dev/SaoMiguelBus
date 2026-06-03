import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import type { TrailListFilters } from '@/features/trails/hooks/useTrailQueries';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const DIFFICULTIES = ['', 'easy', 'moderate', 'hard'] as const;
const SHAPES = ['', 'circular', 'linear'] as const;

export function TrailFilters({
  draft,
  applied,
  onDraftChange,
  onApply,
  onReset,
}: {
  draft: TrailListFilters;
  applied: TrailListFilters;
  onDraftChange: (next: TrailListFilters) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const dirty =
    draft.difficulty !== applied.difficulty ||
    draft.shape !== applied.shape ||
    draft.minLength !== applied.minLength ||
    draft.maxLength !== applied.maxLength;

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
              selected={draft.difficulty === value}
              onPress={() => onDraftChange({ ...draft, difficulty: value || undefined })}
            />
          );
        })}
      </View>

      <Text style={[typography.overline, { color: theme.muted, marginTop: space.sm }]}>{t('trailsFilterShape')}</Text>
      <View style={styles.chips}>
        {SHAPES.map((value) => {
          const label = value ? t(`trailsShape_${value}`) : t('trailsFilterAll');
          return (
            <Chip
              key={value || 'all-shape'}
              label={label}
              selected={draft.shape === value}
              onPress={() => onDraftChange({ ...draft, shape: value || undefined })}
            />
          );
        })}
      </View>

      <View style={styles.lengthRow}>
        <Field
          value={draft.minLength != null ? String(draft.minLength) : ''}
          onChangeText={(text) =>
            onDraftChange({ ...draft, minLength: text ? Number(text) || undefined : undefined })
          }
          placeholder={t('trailsFilterMinKm')}
          keyboardType="decimal-pad"
        />
        <Field
          value={draft.maxLength != null ? String(draft.maxLength) : ''}
          onChangeText={(text) =>
            onDraftChange({ ...draft, maxLength: text ? Number(text) || undefined : undefined })
          }
          placeholder={t('trailsFilterMaxKm')}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.actions}>
        <Button label={t('trailsFilterApply')} onPress={onApply} disabled={!dirty} style={{ flex: 1 }} />
        <Button label={t('trailsFilterReset')} variant="outline" onPress={onReset} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md, paddingHorizontal: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  lengthRow: { flexDirection: 'row', gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
});
