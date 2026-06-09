import { ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Sheet } from '@/components/ui/Sheet';
import { ErrorState } from '@/components/ui/StateView';
import { HourlyForecastList } from '@/features/weather/components/HourlyForecastList';
import { useWeatherParishHourly } from '@/features/weather/hooks/useWeatherQueries';
import { formatAppDate } from '@/lib/date-format';
import { useAppTheme } from '@/lib/theme';

export function DayHourlySheet({
  visible,
  onClose,
  slug,
  date,
}: {
  visible: boolean;
  onClose: () => void;
  slug: string;
  date: string;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const query = useWeatherParishHourly(slug, date, visible && Boolean(slug) && Boolean(date));

  const title = t('weatherHourlyDayTitle', { date: formatAppDate(date) });

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {query.isLoading && !query.data ? (
        <ActivityIndicator color={theme.primary} style={{ paddingVertical: 32 }} />
      ) : null}
      {query.isError ? (
        <ErrorState
          title={t('weatherHourlyLoadError')}
          actionLabel={t('commonRetry')}
          onAction={() => void query.refetch()}
        />
      ) : null}
      {query.data ? <HourlyForecastList hours={query.data.hours} theme={theme} /> : null}
    </Sheet>
  );
}
