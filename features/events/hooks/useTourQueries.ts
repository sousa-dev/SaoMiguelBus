import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { fetchTour, fetchTours } from '@/lib/api';
import { track } from '@/lib/analytics';

export function useTours(enabled = true) {
  const { i18n } = useTranslation();
  return useQuery({
    queryKey: ['tours', 'v1', 'list', i18n.language],
    queryFn: () =>
      fetchTours({
        locale: i18n.language,
        currency: 'EUR',
        limit: 30,
      }),
    enabled,
    staleTime: 1000 * 60 * 30,
    refetchOnMount: 'always',
  });
}

export function useTour(code: string, enabled = true) {
  const { i18n } = useTranslation();
  const normalized = code.trim();
  return useQuery({
    queryKey: ['tours', 'v1', 'detail', normalized, i18n.language],
    queryFn: () =>
      fetchTour(normalized, {
        locale: i18n.language,
        currency: 'EUR',
      }),
    enabled: enabled && normalized.length > 0,
    staleTime: 1000 * 60 * 30,
  });
}

export function trackTourOpen(code: string, title: string) {
  track('tours', 'open', { tour_code: code, title });
}

export function trackTourBookClick(code: string) {
  track('tours', 'book_click', { tour_code: code });
}
