import { useMemo } from 'react';

import type { ModuleKey } from '@/config/island';
import { useSeismicEvents } from '@/features/earthquakes/hooks/useEarthquakeQueries';
import { useTours } from '@/features/events/hooks/useTourQueries';
import { useNewsArticles } from '@/features/news/hooks/useNewsQueries';
import { useTrafficReports } from '@/features/traffic/hooks/useTrafficQueries';
import { useTrails } from '@/features/trails/hooks/useTrailQueries';
import { useResolvedParish, type ResolvedParishSource } from '@/features/weather/hooks/useResolvedParish';
import { useWeatherParish } from '@/features/weather/hooks/useWeatherQueries';
import type { TrailSummary } from '@/features/trails/types';
import { LIVE_SEISMIC_HOURS } from '@/lib/live-alerts';
import type {
  NewsArticle,
  ParishWeather,
  SeismicEvent,
  TourSummary,
  TrafficReport,
} from '@/lib/types';

const HUB_TRAFFIC_POLL_MS = 60_000;
const HOME_NEWS_LIMIT = 3;

export interface HomeData {
  weather: {
    enabled: boolean;
    parish: ParishWeather | undefined;
    source: ResolvedParishSource;
    isLocating: boolean;
    isLoading: boolean;
  };
  seismic: { enabled: boolean; events: SeismicEvent[]; isLoading: boolean };
  traffic: { enabled: boolean; reports: TrafficReport[]; isLoading: boolean };
  news: { enabled: boolean; articles: NewsArticle[]; isLoading: boolean };
  tours: { enabled: boolean; tours: TourSummary[]; isLoading: boolean };
  trails: { enabled: boolean; trails: TrailSummary[]; isLoading: boolean };
  refetchAll: () => void;
}

/**
 * Single gated aggregator for the home dashboard. Each slice only fetches when its
 * module is enabled, mirroring `useHubPreviews`. Bus-CTA data is read directly from
 * local stores by `HomeBusCta` (no network), so it is not part of this hook.
 */
export function useHomeData(enabledKeys: ModuleKey[]): HomeData {
  const enabled = useMemo(() => new Set(enabledKeys), [enabledKeys]);
  const weatherOn = enabled.has('weather');
  const seismicOn = enabled.has('seismic');
  const trafficOn = enabled.has('traffic');
  const newsOn = enabled.has('news');
  const eventsOn = enabled.has('events');
  const trailsOn = enabled.has('trails');

  const resolvedParish = useResolvedParish(weatherOn);
  const weather = useWeatherParish(resolvedParish.slug, weatherOn);
  const seismic = useSeismicEvents(LIVE_SEISMIC_HOURS, seismicOn);
  const traffic = useTrafficReports({
    enabled: trafficOn,
    refetchInterval: HUB_TRAFFIC_POLL_MS,
    limit: 100,
  });
  const news = useNewsArticles({ category: 'noticias', enabled: newsOn });
  const tours = useTours(eventsOn);
  const trails = useTrails({}, trailsOn);

  return useMemo<HomeData>(
    () => ({
      weather: {
        enabled: weatherOn,
        parish: weatherOn ? weather.data : undefined,
        source: resolvedParish.source,
        isLocating: resolvedParish.isLocating,
        isLoading: weatherOn && weather.isLoading,
      },
      seismic: {
        enabled: seismicOn,
        events: seismicOn ? (seismic.data ?? []) : [],
        isLoading: seismicOn && seismic.isLoading,
      },
      traffic: {
        enabled: trafficOn,
        reports: trafficOn ? (traffic.data ?? []) : [],
        isLoading: trafficOn && traffic.isLoading,
      },
      news: {
        enabled: newsOn,
        articles: newsOn ? (news.data ?? []).slice(0, HOME_NEWS_LIMIT) : [],
        isLoading: newsOn && news.isLoading,
      },
      tours: {
        enabled: eventsOn,
        tours: eventsOn ? (tours.data ?? []) : [],
        isLoading: eventsOn && tours.isLoading,
      },
      trails: {
        enabled: trailsOn,
        trails: trailsOn ? (trails.data?.trails ?? []) : [],
        isLoading: trailsOn && trails.isLoading,
      },
      refetchAll: () => {
        if (weatherOn) void weather.refetch();
        if (seismicOn) void seismic.refetch();
        if (trafficOn) void traffic.refetch();
        if (newsOn) void news.refetch();
        if (eventsOn) void tours.refetch();
        if (trailsOn) void trails.refetch();
      },
    }),
    [
      weatherOn,
      seismicOn,
      trafficOn,
      newsOn,
      eventsOn,
      trailsOn,
      weather,
      seismic,
      traffic,
      news,
      tours,
      trails,
      resolvedParish,
    ],
  );
}
