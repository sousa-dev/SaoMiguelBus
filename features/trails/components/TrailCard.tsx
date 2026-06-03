import { Footprints } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { TrailThumb } from '@/features/trails/components/TrailThumb';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme, type AppTheme } from '@/lib/theme';
import type { TrailSummary } from '@/features/trails/types';

export type TrailCardVariant = 'list' | 'grid';

function difficultyLevel(difficulty: string): 0 | 1 | 2 | 3 {
  const d = difficulty.toLowerCase();
  if (d.includes('easy') || d.includes('facil') || d.includes('fácil')) {
    return 1;
  }
  if (d.includes('mod') || d.includes('med')) {
    return 2;
  }
  if (d.includes('hard') || d.includes('dif')) {
    return 3;
  }
  return 0;
}

function difficultyColor(theme: AppTheme, difficulty: string): string {
  switch (difficultyLevel(difficulty)) {
    case 1:
      return theme.success;
    case 2:
      return theme.warning;
    case 3:
      return theme.danger;
    default:
      return theme.muted;
  }
}

function formatDuration(durationMin: number): string {
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  if (hours <= 0) {
    return `${mins}min`;
  }
  return mins > 0 ? `${hours}h${String(mins).padStart(2, '0')}` : `${hours}h`;
}

function DifficultyBars({ difficulty, theme }: { difficulty: string; theme: AppTheme }) {
  const level = difficultyLevel(difficulty);
  const color = difficultyColor(theme, difficulty);
  return (
    <View style={styles.bars}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { height: 5 + i * 3, backgroundColor: i < level ? color : theme.border },
          ]}
        />
      ))}
    </View>
  );
}

function ShapeIndicator({ shape, theme }: { shape: string; theme: AppTheme }) {
  if (shape.toLowerCase().includes('circ')) {
    return <View style={[styles.shapeRing, { borderColor: theme.muted }]} />;
  }
  return <View style={[styles.shapeLine, { backgroundColor: theme.muted }]} />;
}

export function TrailCard({
  trail,
  onPress,
  variant = 'list',
}: {
  trail: TrailSummary;
  onPress: () => void;
  variant?: TrailCardVariant;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const difficultyLabel = trail.difficulty
    ? t(`trailsDifficulty_${trail.difficulty}`, { defaultValue: trail.difficulty })
    : '';
  const shapeLabel = trail.shape ? t(`trailsShape_${trail.shape}`, { defaultValue: trail.shape }) : '';

  if (variant === 'grid') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={trail.name}
        onPress={onPress}
        style={({ pressed }) => [styles.gridPressable, { opacity: pressed ? 0.92 : 1 }]}
      >
        <Card elevated style={styles.gridCard}>
          <TrailThumb uri={trail.mapImageUrl} theme={theme} iconSize={24} style={styles.gridCover} />
          <View style={styles.gridBody}>
            <Text style={[typography.label, { color: theme.text }]} numberOfLines={2}>
              {trail.name}
            </Text>
            <View style={styles.attrRow}>
              {trail.difficulty ? (
                <View style={styles.attr}>
                  <DifficultyBars difficulty={trail.difficulty} theme={theme} />
                  <Text style={[styles.attrText, { color: difficultyColor(theme, trail.difficulty) }]}>
                    {difficultyLabel}
                  </Text>
                </View>
              ) : null}
            </View>
            {trail.distanceKm != null ? (
              <View style={styles.metric}>
                <Footprints size={iconSize.sm} color={theme.muted} />
                <Text style={[typography.caption, { color: theme.muted }]}>
                  {t('trailsDistance', { km: trail.distanceKm.toFixed(1) })}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>
      </Pressable>
    );
  }

  const metaParts = [
    trail.sourceRef,
    trail.distanceKm != null ? `${trail.distanceKm.toFixed(1)} km` : null,
    trail.durationMin != null ? formatDuration(trail.durationMin) : null,
  ].filter(Boolean);

  return (
    <Card onPress={onPress} elevated style={styles.listCard}>
      <View style={styles.listRow}>
        <TrailThumb uri={trail.mapImageUrl} theme={theme} iconSize={26} style={styles.listThumb} />
        <View style={styles.listBody}>
          <Text style={[typography.headline, { color: theme.text }]} numberOfLines={2}>
            {trail.name}
          </Text>
          {metaParts.length ? (
            <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>
              {metaParts.join('  ·  ')}
            </Text>
          ) : null}
          {trail.difficulty || trail.shape ? (
            <View style={styles.attrRow}>
              {trail.difficulty ? (
                <View style={styles.attr}>
                  <DifficultyBars difficulty={trail.difficulty} theme={theme} />
                  <Text style={[styles.attrText, { color: difficultyColor(theme, trail.difficulty) }]}>
                    {difficultyLabel}
                  </Text>
                </View>
              ) : null}
              {trail.difficulty && trail.shape ? (
                <Text style={[styles.attrText, { color: theme.muted }]}>·</Text>
              ) : null}
              {trail.shape ? (
                <View style={styles.attr}>
                  <ShapeIndicator shape={trail.shape} theme={theme} />
                  <Text style={[styles.attrText, { color: theme.muted }]}>{shapeLabel}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  // List (horizontal row)
  listCard: { marginBottom: space.md, padding: space.md, borderRadius: radius.lg },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  listThumb: { width: 72, height: 72, borderRadius: radius.md },
  listBody: { flex: 1, minWidth: 0, gap: 4 },
  meta: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Grid (vertical compact)
  gridPressable: { flex: 1 },
  gridCard: { flex: 1, padding: 0, overflow: 'hidden', borderRadius: radius.lg },
  gridCover: { height: 96, alignItems: 'center', justifyContent: 'center' },
  gridBody: { padding: space.md, gap: space.xs },

  // Shared attribute row (difficulty + shape)
  attrRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
  attr: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  attrText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 11 },
  bar: { width: 3, borderRadius: 1 },
  shapeRing: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5 },
  shapeLine: { width: 12, height: 2, borderRadius: 1 },

  metric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
