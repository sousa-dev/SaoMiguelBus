import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { normalizeHexColor } from '@/features/minibus/lib/vehicleColor';
import { space } from '@/lib/tokens';
import type { MinibusLine } from '@/lib/types';

type Props = {
  lines: MinibusLine[];
  selectedLineSlug: string | null;
  onSelectLineSlug: (slug: string | null) => void;
};

function lineAccentHex(line: MinibusLine): string {
  const normalized = normalizeHexColor(line.color);
  if (normalized) {
    return `#${normalized}`;
  }
  return line.color.startsWith('#') ? line.color : `#${line.color}`;
}

export function MinibusLiveLineFilter({ lines, selectedLineSlug, onSelectLineSlug }: Props) {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.wrap}
    >
      <Chip
        label={t('minibusLiveFilterAll')}
        selected={selectedLineSlug == null}
        onPress={() => onSelectLineSlug(null)}
      />
      {lines.map((line) => (
        <Chip
          key={line.slug}
          label={t('minibusLiveFilterLine', { line: line.code })}
          accentColor={lineAccentHex(line)}
          selected={selectedLineSlug === line.slug}
          onPress={() => onSelectLineSlug(line.slug)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    maxHeight: 44,
  },
  row: {
    gap: space.sm,
    paddingHorizontal: space.md,
    alignItems: 'center',
  },
});
