import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PIN_CAP, useHubStore, type HubColumns, type HubLayout } from '@/lib/hub-store';
import type { AppTheme } from '@/lib/theme';

type HubEditControlsProps = {
  theme: AppTheme;
  pinnedCount: number;
};

export function HubEditControls({ theme, pinnedCount }: HubEditControlsProps) {
  const { t } = useTranslation();
  const layout = useHubStore((s) => s.layout);
  const columns = useHubStore((s) => s.columns);
  const setLayout = useHubStore((s) => s.setLayout);
  const setColumns = useHubStore((s) => s.setColumns);

  return (
    <View style={[styles.wrap, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Text style={[styles.hint, { color: theme.muted }]}>
        {t('hubPinHint', { count: pinnedCount, max: PIN_CAP })}
      </Text>

      <Text style={[styles.label, { color: theme.text }]}>{t('hubLayoutLabel')}</Text>
      <View style={styles.row}>
        <LayoutChip
          theme={theme}
          active={layout === 'grid'}
          label={t('hubLayoutGrid')}
          onPress={() => setLayout('grid')}
        />
        <LayoutChip
          theme={theme}
          active={layout === 'list'}
          label={t('hubLayoutList')}
          onPress={() => setLayout('list')}
        />
      </View>

      {layout === 'grid' ? (
        <>
          <Text style={[styles.label, { color: theme.text, marginTop: 12 }]}>
            {t('hubColumnsLabel')}
          </Text>
          <View style={styles.row}>
            <LayoutChip
              theme={theme}
              active={columns === 2}
              label={t('hubColumns2')}
              onPress={() => setColumns(2)}
            />
            <LayoutChip
              theme={theme}
              active={columns === 3}
              label={t('hubColumns3')}
              onPress={() => setColumns(3)}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

function LayoutChip({
  theme,
  active,
  label,
  onPress,
}: {
  theme: AppTheme;
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: theme.border,
          backgroundColor: active ? theme.primary : theme.background,
        },
      ]}
    >
      <Text style={{ color: active ? '#fff' : theme.text, fontWeight: '600', fontSize: 14 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  label: { fontWeight: '700', fontSize: 14, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
