import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function PremiumLaunchModal({ visible, onClose }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose} title={t('premiumLaunchModalTitle')}>
      <View style={styles.content}>
        <Text style={[typography.body, { color: theme.text }]}>{t('premiumLaunchModalBody')}</Text>
        <Text style={[typography.body, styles.paragraph, { color: theme.text }]}>
          {t('premiumLaunchModalGrandfather')}
        </Text>
        <Button label={t('settingsBack')} onPress={onClose} fullWidth style={styles.button} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg },
  paragraph: { marginTop: space.md },
  button: { marginTop: space.xl },
});
