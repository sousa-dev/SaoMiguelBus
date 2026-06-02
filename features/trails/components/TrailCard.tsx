import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { TrailSummary } from '@/features/trails/types';
import type { AppTheme } from '@/lib/theme';

export function TrailCard({
  trail,
  theme,
  onPress,
}: {
  trail: TrailSummary;
  theme: AppTheme;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const difficultyLabel = trail.difficulty
    ? t(`trailsDifficulty_${trail.difficulty}`, { defaultValue: trail.difficulty })
    : '—';

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
        {trail.name}
      </Text>
      <Text style={{ color: theme.muted, fontSize: 13, marginTop: 6 }}>
        {t('trailsDifficultyLabel', { difficulty: difficultyLabel })}
      </Text>
      {trail.distanceKm != null ? (
        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>
          {t('trailsDistance', { km: trail.distanceKm.toFixed(1) })}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  name: { fontSize: 16, fontWeight: '700' },
});
