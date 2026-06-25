import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Sheet } from '@/components/ui/Sheet';
import type { MinibusLiveMapStopPin } from '@/features/minibus/lib/liveNetworkMapStops';
import { trackLiveNavigateViewLine } from '@/features/minibus/lib/live-analytics';
import { onColorFor } from '@/lib/color-utils';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
  pin: MinibusLiveMapStopPin | null;
  onClose: () => void;
};

export function MinibusLiveStopSheet({ visible, pin, onClose }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();

  if (!visible || !pin) {
    return null;
  }

  const { stop, lines } = pin;
  const transfers = stop.interchange_lines.filter(Boolean);
  const sortedLines = [...lines].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <Sheet visible={visible} onClose={onClose} title={stop.name_pt}>
      <View style={styles.wrap}>
        <Text style={[typography.caption, { color: theme.muted }]}>
          {sortedLines.length === 1
            ? t('minibusLiveStopSequence', { sequence: sortedLines[0].sequence })
            : t('minibusLiveStopServedBy')}
        </Text>

        <View style={styles.lineRow}>
          {sortedLines.map((line) => (
            <Pressable
              key={`${line.slug}-${line.sequence}`}
              accessibilityRole="button"
              accessibilityLabel={t('minibusLiveStopViewLine', { line: line.code })}
              onPress={() => {
                trackLiveNavigateViewLine(line.slug);
                onClose();
                router.push(`/minibus/${encodeURIComponent(line.slug)}`);
              }}
              style={({ pressed }) => [
                styles.lineChip,
                { backgroundColor: line.color, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[typography.label, { color: onColorFor(line.color) }]}>
                {line.code}
                {sortedLines.length > 1 ? ` · ${line.sequence}` : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        {transfers.length > 0 ? (
          <Text style={[typography.body, { color: theme.muted, marginTop: space.md }]}>
            {t('minibusInterchangeWith', { lines: transfers.join(', ') })}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: space.lg,
  },
  lineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.sm,
  },
  lineChip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.full,
  },
});
