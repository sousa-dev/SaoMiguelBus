import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/ui/StateView';
import { AdBanner } from '@/features/ads/components/AdBanner';
import { MinibusAttributionFooter } from '@/features/minibus/components/MinibusAttributionFooter';
import { MinibusPdfViewer } from '@/features/minibus/components/MinibusPdfViewer';
import { buildMinibusDocumentFileUrl } from '@/features/minibus/pdfUrl';
import { useMinibusSchematic } from '@/features/minibus/hooks/useMinibusQueries';
import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const SCHEMATIC_SLUG = 'schematic';

export default function MinibusSchematicScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const schematicQuery = useMinibusSchematic();

  if (schematicQuery.isLoading) {
    return (
      <Screen withStackHeader>
        <LoadingState />
      </Screen>
    );
  }

  const hasFile = schematicQuery.data?.has_file;
  const url = hasFile ? buildMinibusDocumentFileUrl(SCHEMATIC_SLUG) : '';

  if (!url) {
    return (
      <Screen withStackHeader>
        <ErrorState title={t('minibusLoadError')} />
      </Screen>
    );
  }

  return (
    <Screen withStackHeader edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: theme.background }}>
        <View style={styles.adTop}>
          <AdBanner on="home" slot="minibus-schematic-top" />
        </View>
        <View style={styles.viewer}>
          <MinibusPdfViewer url={url} slug={SCHEMATIC_SLUG} />
        </View>
        <MinibusAttributionFooter
          sourceUrl={schematicQuery.data?.source_url}
          importedAt={schematicQuery.data?.imported_at}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: space.md },
  adTop: { marginBottom: space.md },
  viewer: { height: 420 },
});
