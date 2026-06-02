import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Clock, ExternalLink, Newspaper } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/StateView';
import { useNewsArticle } from '@/features/news/hooks/useNewsQueries';
import { track } from '@/lib/analytics';
import { iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export default function NewsArticleScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { articleId } = useLocalSearchParams<{ articleId: string }>();
  const id = Number(articleId);
  const article = useNewsArticle(id, Number.isFinite(id));

  useEffect(() => {
    if (article.data) {
      track('news', 'open', { article_id: article.data.id, source: article.data.source.name });
    }
  }, [article.data?.id]);

  if (article.isLoading) {
    return (
      <Screen withStackHeader>
        <LoadingState />
      </Screen>
    );
  }

  if (!article.data) {
    return (
      <Screen withStackHeader>
        <ErrorState title={t('newsNotFound')} />
      </Screen>
    );
  }

  const data = article.data;

  return (
    <Screen withStackHeader>
      <ScrollView contentContainerStyle={styles.container}>
        {data.category ? <Badge label={data.category} tone="primary" /> : null}
        <Text style={[typography.title, { color: theme.text, marginTop: space.md }]}>{data.title}</Text>
        <View style={styles.meta}>
          <Newspaper size={iconSize.sm} color={theme.muted} />
          <Text style={[typography.caption, { color: theme.muted }]}>{data.source.name}</Text>
          <Clock size={iconSize.sm} color={theme.muted} />
          <Text style={[typography.caption, { color: theme.muted }]}>
            {new Date(data.publishedAt).toLocaleString()}
          </Text>
        </View>
        {data.summary ? (
          <Card style={{ marginTop: space.lg }}>
            <Text style={[typography.body, { color: theme.text, lineHeight: 24 }]}>{data.summary}</Text>
          </Card>
        ) : null}
        <Button
          label={t('newsReadOriginal')}
          variant="outline"
          fullWidth
          onPress={() => WebBrowser.openBrowserAsync(data.link)}
          style={{ marginTop: space.xl }}
        />
        <View style={styles.external}>
          <ExternalLink size={14} color={theme.muted} />
          <Text style={[typography.caption, { color: theme.muted, marginLeft: 4 }]}>
            {t('newsReadOriginal')}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, paddingBottom: space['4xl'] },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, marginTop: space.md },
  external: { flexDirection: 'row', justifyContent: 'center', marginTop: space.sm },
});
