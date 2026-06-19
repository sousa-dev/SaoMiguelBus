import { Linking, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/StateView';
import { MinibusAttributionFooter } from '@/features/minibus/components/MinibusAttributionFooter';
import { MinibusPdfViewer } from '@/features/minibus/components/MinibusPdfViewer';
import {
  buildMinibusDocumentFileUrl,
  isValidMinibusDocumentSlug,
} from '@/features/minibus/pdfUrl';
import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

function param(value: string | string[] | undefined): string {
  if (value == null) {
    return '';
  }
  return typeof value === 'string' ? value : (value[0] ?? '');
}

export default function MinibusPdfScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const slug = param(useLocalSearchParams<{ slug?: string }>().slug);
  const url = isValidMinibusDocumentSlug(slug) ? buildMinibusDocumentFileUrl(slug) : '';

  if (!url) {
    return (
      <Screen withStackHeader>
        <ErrorState title={t('minibusLoadError')} />
      </Screen>
    );
  }

  return (
    <Screen withStackHeader edges={['bottom']}>
      <View style={[styles.viewer, { backgroundColor: theme.background }]}>
        <MinibusPdfViewer url={url} slug={slug} />
      </View>
      <View style={styles.footer}>
        <Button
          label={t('minibusOpenExternal')}
          variant="outline"
          fullWidth
          onPress={() => void WebBrowser.openBrowserAsync(url)}
        />
        <Button
          label={t('minibusSourceLink')}
          variant="ghost"
          fullWidth
          onPress={() => void Linking.openURL('https://pdlminibus.pt')}
        />
        <MinibusAttributionFooter sourceUrl="https://pdlminibus.pt" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1 },
  footer: { padding: space.md, gap: space.sm },
});
