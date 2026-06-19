import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { staticIslandConfig } from '@/config/island';
import { resolveMinibusApiLocale } from '@/features/minibus/locale';
import {
  fetchMinibusDocuments,
  fetchMinibusLine,
  fetchMinibusLines,
  fetchMinibusNetwork,
  fetchMinibusSchematic,
  fetchMinibusTariffs,
} from '@/lib/api';

export function useMinibusLines(enabled = true) {
  const { i18n } = useTranslation();
  const locale = resolveMinibusApiLocale(i18n.language);

  return useQuery({
    queryKey: ['minibus', 'v1', 'lines', staticIslandConfig.islandKey, locale],
    queryFn: () => fetchMinibusLines({ locale }),
    enabled,
    staleTime: 1000 * 60 * 60,
  });
}

export function useMinibusLine(slug: string, enabled = true) {
  const { i18n } = useTranslation();
  const locale = resolveMinibusApiLocale(i18n.language);

  return useQuery({
    queryKey: ['minibus', 'v1', 'line', staticIslandConfig.islandKey, slug, locale],
    queryFn: () => fetchMinibusLine(slug, { locale }),
    enabled: enabled && Boolean(slug),
    staleTime: 1000 * 60 * 60,
  });
}

export function useMinibusTariffs(enabled = true) {
  const { i18n } = useTranslation();
  const locale = resolveMinibusApiLocale(i18n.language);

  return useQuery({
    queryKey: ['minibus', 'v1', 'tariffs', staticIslandConfig.islandKey, locale],
    queryFn: () => fetchMinibusTariffs({ locale }),
    enabled,
    staleTime: 1000 * 60 * 60,
  });
}

export function useMinibusDocuments(enabled = true) {
  const { i18n } = useTranslation();
  const locale = resolveMinibusApiLocale(i18n.language);

  return useQuery({
    queryKey: ['minibus', 'v1', 'documents', staticIslandConfig.islandKey, locale],
    queryFn: () => fetchMinibusDocuments({ locale }),
    enabled,
    staleTime: 1000 * 60 * 60,
  });
}

export function useMinibusNetwork(enabled = true) {
  const { i18n } = useTranslation();
  const locale = resolveMinibusApiLocale(i18n.language);

  return useQuery({
    queryKey: ['minibus', 'v1', 'network', staticIslandConfig.islandKey, locale],
    queryFn: () => fetchMinibusNetwork({ locale }),
    enabled,
    staleTime: 1000 * 60 * 60,
  });
}

export function useMinibusSchematic(enabled = true) {
  const { i18n } = useTranslation();
  const locale = resolveMinibusApiLocale(i18n.language);

  return useQuery({
    queryKey: ['minibus', 'v1', 'schematic', staticIslandConfig.islandKey, locale],
    queryFn: () => fetchMinibusSchematic({ locale }),
    enabled,
    staleTime: 1000 * 60 * 60,
  });
}
