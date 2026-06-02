import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { useNewsArticle } from '@/features/news/hooks/useNewsQueries';
import { track } from '@/lib/analytics';
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
    return <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />;
  }

  if (!article.data) {
    return <Text style={{ color: theme.muted, padding: 16 }}>{t('newsNotFound')}</Text>;
  }

  const data = article.data;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>{data.title}</Text>
      <Text style={{ color: theme.muted, marginBottom: 12 }}>
        {data.source.name} · {new Date(data.publishedAt).toLocaleString()}
      </Text>
      {data.summary ? (
        <Text style={{ color: theme.text, lineHeight: 22, marginBottom: 20 }}>{data.summary}</Text>
      ) : null}
      <Pressable
        onPress={() => WebBrowser.openBrowserAsync(data.link)}
        style={[styles.btn, { backgroundColor: theme.primary }]}
      >
        <Text style={styles.btnText}>{t('newsReadOriginal')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  btn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
