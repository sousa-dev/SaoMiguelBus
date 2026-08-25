import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { fetchNewsArticle, fetchNewsArticles, fetchNewsSources } from '@/lib/api';
import { track } from '@/lib/analytics';

export function useNewsSources(enabled = true) {
  const { i18n } = useTranslation();
  return useQuery({
    queryKey: ['news', 'v2', 'sources', i18n.language],
    queryFn: () => fetchNewsSources(),
    enabled,
    staleTime: 1000 * 60 * 30,
  });
}

export function useNewsArticles(params: {
  category?: string;
  q?: string;
  source?: number;
  enabled?: boolean;
}) {
  const { i18n } = useTranslation();
  return useQuery({
    queryKey: ['news', 'v2', 'articles', params, i18n.language],
    queryFn: async () => {
      const articles = await fetchNewsArticles({
        category: params.category,
        q: params.q,
        source: params.source,
      });
      if (params.q) {
        track('news', 'search', { query: params.q, results_count: articles.length });
      }
      return articles;
    },
    enabled: params.enabled !== false,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: 'always',
  });
}

export function useNewsArticle(articleId: number, enabled = true) {
  return useQuery({
    queryKey: ['news', 'article', articleId],
    queryFn: () => fetchNewsArticle(articleId),
    enabled: enabled && articleId > 0,
    staleTime: 1000 * 60 * 5,
  });
}
