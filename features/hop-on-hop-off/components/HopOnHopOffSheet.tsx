import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { resolveHopOnOffUrl } from '@/config/hop-on-hop-off';
import type { HopOnOffSource } from '@/features/hop-on-hop-off/lib/analytics';
import { trackHopOnOffBookClick } from '@/features/hop-on-hop-off/lib/analytics';
import { openHopOnOffExternal } from '@/features/hop-on-hop-off/lib/external-link';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
  source: HopOnOffSource | null;
  onClose: () => void;
};

export function HopOnHopOffSheet({ visible, source, onClose }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const onBook = () => {
    const url = resolveHopOnOffUrl();
    if (source) {
      trackHopOnOffBookClick(source, url);
    }
    openHopOnOffExternal(url);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('hopOnOffSheetTitle')}>
      <View style={styles.body}>
        <Text style={[typography.body, { color: theme.text }]}>{t('hopOnOffSheetBody')}</Text>
        <View style={styles.bullets}>
          <Text style={[typography.body, styles.bullet, { color: theme.text }]}>
            {t('hopOnOffSheetBullet1')}
          </Text>
          <Text style={[typography.body, styles.bullet, { color: theme.text }]}>
            {t('hopOnOffSheetBullet2')}
          </Text>
          <Text style={[typography.body, styles.bullet, { color: theme.text }]}>
            {t('hopOnOffSheetBullet3')}
          </Text>
        </View>
        <Text style={[typography.caption, { color: theme.muted }]}>{t('hopOnOffSheetDisclaimer')}</Text>
        <Button label={t('hopOnOffSheetBookButton')} onPress={onBook} fullWidth />
        <Button label={t('hopOnOffSheetClose')} variant="ghost" onPress={onClose} fullWidth />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  bullets: { gap: space.sm },
  bullet: { paddingLeft: space.sm },
});
