import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  sourceUrl?: string | null;
  importedAt?: string | null;
};

export function MinibusAttributionFooter({ sourceUrl, importedAt }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const openSource = () => {
    void Linking.openURL(sourceUrl ?? 'https://pdlminibus.pt');
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.text, { color: theme.muted }]}>{t('minibusAttribution')}</Text>
      <Pressable onPress={openSource} accessibilityRole="link">
        <Text style={[styles.link, { color: theme.primary }]}>{t('minibusSourceLink')}</Text>
      </Pressable>
      {importedAt ? (
        <Text style={[styles.text, { color: theme.muted }]}>
          {t('minibusImportedAt', { date: new Date(importedAt).toLocaleDateString() })}
        </Text>
      ) : null}
      <Text style={[styles.text, { color: theme.muted }]}>{t('minibusDisclaimer')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.lg, marginBottom: space.md, gap: space.xs },
  text: { ...typography.caption, textAlign: 'center' },
  link: { ...typography.caption, textAlign: 'center', fontWeight: '600' },
});
