import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { fetchNewsArticle, fetchNewsArticles } from '@/lib/api';
import { track } from '@/lib/analytics';

export function useNewsArticles(params: {
  category?: string;
  q?: string;
  enabled?: boolean;
}) {
  const { i18n } = useTranslation();
  return useQuery({
    queryKey: ['news', 'articles', params, i18n.language],
    queryFn: async () => {
      const articles = await fetchNewsArticles({
        category: params.category,
        q: params.q,
        limit: 50,
      });
      if (params.q) {
        track('news', 'search', { query: params.q, results_count: articles.length });
      }
      return articles;
    },
    enabled: params.enabled !== false,
    networkMode: 'online',
  });
}

export function useNewsArticle(articleId: number, enabled = true) {
  return useQuery({
    queryKey: ['news', 'article', articleId],
    queryFn: () => fetchNewsArticle(articleId),
    enabled: enabled && articleId > 0,
    networkMode: 'online',
  });
}
