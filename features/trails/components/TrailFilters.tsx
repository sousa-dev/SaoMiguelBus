import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { TrailListFilters } from '@/features/trails/hooks/useTrailQueries';
import type { AppTheme } from '@/lib/theme';

const DIFFICULTIES = ['', 'easy', 'moderate', 'hard'] as const;
const SHAPES = ['', 'circular', 'linear'] as const;

export function TrailFilters({
  theme,
  draft,
  applied,
  onDraftChange,
  onApply,
  onReset,
}: {
  theme: AppTheme;
  draft: TrailListFilters;
  applied: TrailListFilters;
  onDraftChange: (next: TrailListFilters) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const dirty =
    draft.difficulty !== applied.difficulty ||
    draft.shape !== applied.shape ||
    draft.minLength !== applied.minLength ||
    draft.maxLength !== applied.maxLength;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.muted }]}>{t('trailsFilterDifficulty')}</Text>
      <View style={styles.chips}>
        {DIFFICULTIES.map((value) => {
          const active = draft.difficulty === value;
          const label = value
            ? t(`trailsDifficulty_${value}`, { defaultValue: value })
            : t('trailsFilterAll');
          return (
            <Pressable
              key={value || 'all-diff'}
              onPress={() => onDraftChange({ ...draft, difficulty: value || undefined })}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primary : theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={{ color: active ? '#fff' : theme.text, fontSize: 12 }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: theme.muted }]}>{t('trailsFilterShape')}</Text>
      <View style={styles.chips}>
        {SHAPES.map((value) => {
          const active = draft.shape === value;
          const label = value ? t(`trailsShape_${value}`) : t('trailsFilterAll');
          return (
            <Pressable
              key={value || 'all-shape'}
              onPress={() => onDraftChange({ ...draft, shape: value || undefined })}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primary : theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={{ color: active ? '#fff' : theme.text, fontSize: 12 }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.lengthRow}>
        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.card }]}
          value={draft.minLength != null ? String(draft.minLength) : ''}
          onChangeText={(text) =>
            onDraftChange({
              ...draft,
              minLength: text ? Number(text) || undefined : undefined,
            })
          }
          placeholder={t('trailsFilterMinKm')}
          placeholderTextColor={theme.muted}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.card }]}
          value={draft.maxLength != null ? String(draft.maxLength) : ''}
          onChangeText={(text) =>
            onDraftChange({
              ...draft,
              maxLength: text ? Number(text) || undefined : undefined,
            })
          }
          placeholder={t('trailsFilterMaxKm')}
          placeholderTextColor={theme.muted}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onApply}
          disabled={!dirty}
          style={[styles.btn, { backgroundColor: dirty ? theme.primary : theme.border }]}
        >
          <Text style={styles.btnText}>{t('trailsFilterApply')}</Text>
        </Pressable>
        <Pressable onPress={onReset} style={[styles.btn, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
          <Text style={{ color: theme.text, fontWeight: '600' }}>{t('trailsFilterReset')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 12, marginBottom: 6, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  lengthRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
