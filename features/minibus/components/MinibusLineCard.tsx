import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { formatServiceSummary } from '@/features/minibus/serviceSummary';
import type { MinibusLine } from '@/lib/types';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

type Props = {
  line: MinibusLine;
  onPress: () => void;
};

export function MinibusLineCard({ line, onPress }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.badge, { backgroundColor: line.color }]}>
            <Text style={styles.badgeText}>{line.code}</Text>
          </View>
          <View style={styles.content}>
            <Text style={[typography.headline, { color: theme.text }]}>{line.name}</Text>
            <Text style={[typography.caption, { color: theme.muted, marginTop: space.xs }]}>
              {formatServiceSummary(line.service_summary, t)}
            </Text>
          </View>
          <ChevronRight color={theme.muted} size={18} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#111', fontWeight: '800' },
  content: { flex: 1 },
});
