import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { NewsArticle } from '@/lib/types';
import type { AppTheme } from '@/lib/theme';

export function NewsCard({
  article,
  theme,
  onPress,
}: {
  article: NewsArticle;
  theme: AppTheme;
  onPress: () => void;
}) {
  const date = new Date(article.publishedAt).toLocaleDateString();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
        {article.title}
      </Text>
      {article.summary ? (
        <Text style={{ color: theme.muted, marginTop: 6 }} numberOfLines={3}>
          {article.summary}
        </Text>
      ) : null}
      <View style={styles.meta}>
        <Text style={{ color: theme.muted, fontSize: 12 }}>{article.source.name}</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>{date}</Text>
      </View>
      {article.category ? (
        <Text style={[styles.badge, { color: theme.secondary }]}>{article.category}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: '700' },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  badge: { marginTop: 6, fontSize: 12, fontWeight: '600' },
});
