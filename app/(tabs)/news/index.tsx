import { Newspaper } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateView';
import { NewsCard } from '@/features/news/components/NewsCard';
import { NewsFilters, type NewsTabCategory } from '@/features/news/components/NewsFilters';
import { useNewsArticles, useNewsSources } from '@/features/news/hooks/useNewsQueries';
import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export default function NewsScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<NewsTabCategory>('noticias');
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearchQ(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const sources = useNewsSources();
  const articles = useNewsArticles({
    category,
    q: searchQ || undefined,
    source: sourceId ?? undefined,
  });

  useFocusEffect(
    useCallback(() => {
      void articles.refetch();
    }, [articles.refetch]),
  );

  const onRefresh = useCallback(() => {
    void articles.refetch();
  }, [articles.refetch]);

  const data = articles.data ?? [];

  return (
    <Screen withStackHeader>
      <NewsFilters
        query={query}
        category={category}
        sources={sources.data ?? []}
        sourceId={sourceId}
        onQueryChange={setQuery}
        onCategoryChange={setCategory}
        onSourceChange={setSourceId}
        onSearch={() => setSearchQ(query.trim())}
      />

      {articles.isLoading ? (
        <View style={{ padding: space.lg }}>
          <CardSkeleton />
        </View>
      ) : null}

      {articles.isError ? (
        <ErrorState title={t('newsLoadError')} actionLabel={t('searchButton')} onAction={() => void articles.refetch()} />
      ) : null}

      <FlatList
        data={articles.isLoading ? [] : data}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={articles.isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          !articles.isLoading && !articles.isError ? (
            <EmptyState icon={Newspaper} title={t('newsEmpty')} />
          ) : null
        }
        renderItem={({ item }) => (
          <NewsCard
            article={item}
            showSummary={category === 'pagamentos'}
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
  list: { padding: space.lg, paddingBottom: space['2xl'] },
});
