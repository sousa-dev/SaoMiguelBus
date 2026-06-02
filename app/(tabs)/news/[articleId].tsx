import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { useNewsArticle } from '@/features/news/hooks/useNewsQueries';
import { track } from '@/lib/analytics';
import { space, typography } from '@/lib/tokens';
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
    return <ActivityIndicator color={theme.primary} style={{ marginTop: space['2xl'] }} />;
  }

  if (!article.data) {
    return <Text style={{ color: theme.muted, padding: space.lg }}>{t('newsNotFound')}</Text>;
  }

  const data = article.data;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[typography.display, { color: theme.text, fontSize: 22 }]}>{data.title}</Text>
      <Text style={[typography.caption, { color: theme.muted, marginVertical: space.md }]}>
        {data.source.name} · {new Date(data.publishedAt).toLocaleString()}
      </Text>
      {data.summary ? (
        <Text style={[typography.body, { color: theme.text, lineHeight: 22, marginBottom: space.lg }]}>{data.summary}</Text>
      ) : null}
      <Button label={t('newsReadOriginal')} fullWidth onPress={() => WebBrowser.openBrowserAsync(data.link)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.lg },
});
