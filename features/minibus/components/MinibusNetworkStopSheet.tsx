import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Radio } from 'lucide-react-native';

import { Sheet } from '@/components/ui/Sheet';
import type {
  MinibusLiveMapStopLine,
  MinibusLiveMapStopPin,
} from '@/features/minibus/lib/liveNetworkMapStops';
import { MINIBUS_ACCENT } from '@/features/minibus/lib/moduleAccent';
import { onColorFor, withAlpha } from '@/lib/color-utils';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
  pin: MinibusLiveMapStopPin | null;
  onClose: () => void;
  /** Opens the fleet-wide live map pre-filtered to this line. */
  onViewLive: (line: MinibusLiveMapStopLine) => void;
};

/**
 * Stop detail for the network map: the lines serving the stop, each row
 * opening the line detail, plus a per-line "view live" action that jumps into
 * the existing live map filtered to that line. MiniBus has no per-stop
 * arrivals endpoint (the fleet feed carries positions only), so the sheet
 * shows what the data honestly supports — served lines and where to watch
 * them run — rather than inventing departures.
 */
export function MinibusNetworkStopSheet({ visible, pin, onClose, onViewLive }: Props) {
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

        <View style={styles.lineList}>
          {sortedLines.map((line) => (
            <Pressable
              key={`${line.slug}-${line.sequence}`}
              accessibilityRole="button"
              accessibilityLabel={t('minibusLiveStopViewLine', { line: line.code })}
              onPress={() => {
                onClose();
                router.push(`/minibus/${encodeURIComponent(line.slug)}`);
              }}
              style={({ pressed }) => [
                styles.lineRow,
                { backgroundColor: theme.card, borderColor: theme.border },
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={[styles.lineChip, { backgroundColor: line.color }]}>
                <Text style={[typography.label, { color: onColorFor(line.color) }]}>
                  {line.code}
                  {sortedLines.length > 1 ? ` · ${line.sequence}` : ''}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('minibusNetworkStopViewLiveLine', { line: line.code })}
                onPress={() => onViewLive(line)}
                style={({ pressed }) => [
                  styles.livePill,
                  { backgroundColor: withAlpha(MINIBUS_ACCENT, 0.12) },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Radio size={14} color={MINIBUS_ACCENT} strokeWidth={2} />
                <Text style={[typography.caption, { color: MINIBUS_ACCENT, fontWeight: '600' }]}>
                  {t('minibusNetworkStopViewLive')}
                </Text>
              </Pressable>
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
  lineList: {
    gap: space.sm,
    marginTop: space.sm,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  lineChip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.full,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.full,
  },
});
