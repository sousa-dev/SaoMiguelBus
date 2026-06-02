import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { NewsCard } from '@/features/news/components/NewsCard';
import { NewsFilters } from '@/features/news/components/NewsFilters';
import { useNewsArticles } from '@/features/news/hooks/useNewsQueries';
import { useAppTheme } from '@/lib/theme';

export default function NewsScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [searchQ, setSearchQ] = useState('');

  const articles = useNewsArticles({ category: category || undefined, q: searchQ || undefined });

  useFocusEffect(
    useCallback(() => {
      void articles.refetch();
    }, [articles.refetch]),
  );

  const onRefresh = useCallback(() => {
    void articles.refetch();
  }, [articles.refetch]);

  return (
    <Screen withStackHeader>
      <NewsFilters
        query={query}
        category={category}
        onQueryChange={setQuery}
        onCategoryChange={setCategory}
        onSearch={() => setSearchQ(query.trim())}
      />

      {articles.isLoading ? <ActivityIndicator color={theme.primary} /> : null}
      {articles.isError ? (
        <Text style={{ color: theme.muted }}>{t('newsLoadError')}</Text>
      ) : null}

      <FlatList
        data={articles.data ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={articles.isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          !articles.isLoading ? (
            <Text style={{ color: theme.muted, textAlign: 'center', marginTop: 24 }}>
              {t('newsEmpty')}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <NewsCard
            article={item}
            theme={theme}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/news/[articleId]',
                params: { articleId: String(item.id) },
              })
            }
          />
        )}
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32 },
});
