import { Clock, Footprints, Mountain } from 'lucide-react-native';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { TrailSummary } from '@/features/trails/types';

function difficultyTone(difficulty: string): 'primary' | 'danger' | 'neutral' | 'accent' {
  const d = difficulty.toLowerCase();
  if (d.includes('easy') || d.includes('facil')) {
    return 'accent';
  }
  if (d.includes('hard') || d.includes('dif')) {
    return 'danger';
  }
  if (d.includes('mod')) {
    return 'primary';
  }
  return 'neutral';
}

export function TrailCard({
  trail,
  onPress,
}: {
  trail: TrailSummary;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const difficultyLabel = trail.difficulty
    ? t(`trailsDifficulty_${trail.difficulty}`, { defaultValue: trail.difficulty })
    : '—';
  const hasMapImage = Boolean(trail.mapImageUrl?.trim());

  return (
    <Card onPress={onPress} elevated style={styles.card}>
      <View style={[styles.cover, { backgroundColor: theme.surfaceVariant }]}>
        {hasMapImage ? (
          <Image source={{ uri: trail.mapImageUrl! }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <Mountain size={32} color={theme.muted} />
        )}
      </View>
      <View style={styles.body}>
        <Text style={[typography.headline, { color: theme.text }]} numberOfLines={2}>
          {trail.name}
        </Text>
        {trail.difficulty ? (
          <Badge label={difficultyLabel} tone={difficultyTone(trail.difficulty)} />
        ) : null}
        <View style={styles.metrics}>
          {trail.distanceKm != null ? (
            <View style={styles.metric}>
              <Footprints size={iconSize.sm} color={theme.muted} />
              <Text style={[typography.caption, { color: theme.muted }]}>
                {t('trailsDistance', { km: trail.distanceKm.toFixed(1) })}
              </Text>
            </View>
          ) : null}
          {trail.durationMin != null ? (
            <View style={styles.metric}>
              <Clock size={iconSize.sm} color={theme.muted} />
              <Text style={[typography.caption, { color: theme.muted }]}>
                {t('trailsDurationShort', {
                  hours: Math.floor(trail.durationMin / 60),
                  minutes: trail.durationMin % 60,
                })}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.md, padding: 0, overflow: 'hidden', borderRadius: radius.lg },
  cover: { height: 120, alignItems: 'center', justifyContent: 'center' },
  coverImage: { width: '100%', height: '100%' },
  body: { padding: space.lg, gap: space.sm },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.xs },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
