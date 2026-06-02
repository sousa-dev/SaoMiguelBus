import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';
import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { PIN_CAP, useHubStore, type HubColumns, type HubLayout } from '@/lib/hub-store';
import { space, typography } from '@/lib/tokens';

type HubEditControlsProps = {
  pinnedCount: number;
  showBarFull: boolean;
};

export function HubEditControls({ pinnedCount, showBarFull }: HubEditControlsProps) {
  const { t } = useTranslation();
  const layout = useHubStore((s) => s.layout);
  const columns = useHubStore((s) => s.columns);
  const setLayout = useHubStore((s) => s.setLayout);
  const setColumns = useHubStore((s) => s.setColumns);

  const layoutOptions = [
    { value: 'grid' as HubLayout, label: t('hubLayoutGrid') },
    { value: 'list' as HubLayout, label: t('hubLayoutList') },
  ];

  const columnOptions: { value: '2' | '3'; label: string }[] = [
    { value: '2', label: t('hubColumns2') },
    { value: '3', label: t('hubColumns3') },
  ];

  return (
    <View style={styles.wrap}>
      {showBarFull ? (
        <View accessibilityRole="alert">
          <Banner variant="warning" message={t('hubNavbarFull')} />
        </View>
      ) : null}

      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={[typography.label, styles.flex]}>{t('hubPinHint', { count: pinnedCount, max: PIN_CAP })}</Text>
          <Badge label={t('hubBarCounter', { count: pinnedCount, max: PIN_CAP })} tone="primary" />
        </View>

        <Text style={[typography.overline, styles.sectionLabel]}>{t('hubLayoutLabel')}</Text>
        <SegmentedControl
          options={layoutOptions}
          value={layout}
          onChange={setLayout}
          accessibilityLabel={t('hubLayoutLabel')}
        />

        {layout === 'grid' ? (
          <>
            <Text style={[typography.overline, styles.sectionLabel]}>{t('hubColumnsLabel')}</Text>
            <SegmentedControl
              options={columnOptions}
              value={String(columns) as '2' | '3'}
              onChange={(v) => setColumns(Number(v) as HubColumns)}
              accessibilityLabel={t('hubColumnsLabel')}
            />
          </>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.sm },
  card: { marginHorizontal: space.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.lg,
  },
  flex: { flex: 1 },
  sectionLabel: { marginTop: space.md, marginBottom: space.sm },
});
