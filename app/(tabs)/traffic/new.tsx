import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { TrafficReportForm } from '@/features/traffic/components/TrafficReportForm';
import {
  useCreateTrafficReport,
  useTrafficCategories,
} from '@/features/traffic/hooks/useTrafficQueries';
import { useNearbyLocation } from '@/features/traffic/hooks/useNearbyLocation';
import type { TrafficReportWriteInput } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';
import { useTrafficStore } from '@/lib/traffic-store';

export default function NewTrafficReportScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();

  const categories = useTrafficCategories();
  const create = useCreateTrafficReport();
  const addReport = useTrafficStore((s) => s.addReport);
  const { coords } = useNearbyLocation(true);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (input: TrafficReportWriteInput) => {
    setError(null);
    try {
      const report = await create.mutateAsync(input);
      addReport(report.id);
      router.back();
    } catch {
      setError(t('trafficReportError'));
    }
  };

  return (
    <TrafficReportForm
      theme={theme}
      categories={categories.data ?? []}
      initialCategory={params.category}
      coords={coords}
      submitting={create.isPending}
      error={error}
      onSubmit={(input) => void onSubmit(input)}
    />
  );
}
