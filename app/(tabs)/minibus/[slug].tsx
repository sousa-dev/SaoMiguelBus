import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/ui/StateView';
import { MinibusAttributionFooter } from '@/features/minibus/components/MinibusAttributionFooter';
import { MinibusLineImage } from '@/features/minibus/components/MinibusLineImage';
import { useMinibusOffline } from '@/features/minibus/hooks/useMinibusOffline';
import { useMinibusLine } from '@/features/minibus/hooks/useMinibusQueries';
import { localLineImageUri } from '@/features/minibus/offline';
import { formatServiceSummary } from '@/features/minibus/serviceSummary';
import { track } from '@/lib/analytics';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export default function MinibusLineDetailScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const lineQuery = useMinibusLine(slug, Boolean(slug));
  const { snapshot } = useMinibusOffline();

  // Offline-aware: fall back to the cached snapshot line when the query has no data.
  const cachedLine = snapshot?.bundle?.lines.find((l) => l.slug === slug) ?? null;
  const line = lineQuery.data ?? cachedLine;

  useEffect(() => {
    if (line) {
      track('minibus', 'view', { screen: 'line', line: line.code });
    }
  }, [line?.code]);

  if (!line) {
    return (
      <Screen withStackHeader>
        {lineQuery.isLoading ? <LoadingState /> : <ErrorState title={t('minibusLoadError')} />}
      </Screen>
    );
  }

  const sourceUrl = lineQuery.data?.source_url ?? snapshot?.bundle?.source_url ?? null;
  const importedAt = lineQuery.data?.imported_at ?? snapshot?.bundle?.imported_at ?? null;
  const localUri = localLineImageUri(snapshot, line.slug);

  return (
    <Screen withStackHeader>
      <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: theme.background }}>
        <View style={[styles.colorBar, { backgroundColor: line.color }]} />
        <Text style={[typography.title, { color: theme.text }]}>{line.name}</Text>
        <Text style={[typography.body, { color: theme.muted, marginTop: space.sm }]}>
          {formatServiceSummary(line.service_summary, t)}
        </Text>

        <Text style={[typography.headline, { color: theme.text, marginTop: space.lg }]}>
          {t('minibusTimetable')}
        </Text>
        <View style={styles.imageWrap}>
          <MinibusLineImage
            localUri={localUri}
            remoteUrl={line.timetable_file_url}
            accessibilityLabel={t('minibusTimetableImageAlt', { line: line.name })}
          />
        </View>

        <MinibusAttributionFooter sourceUrl={sourceUrl} importedAt={importedAt} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl },
  colorBar: { width: 48, height: 6, borderRadius: 3, marginBottom: space.md },
  imageWrap: { marginTop: space.sm },
});
