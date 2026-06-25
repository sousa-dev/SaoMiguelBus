import { useQuery } from '@tanstack/react-query';

import { fetchRouteWeather } from '@/lib/api';
import { track } from '@/lib/analytics';
import type { RouteWeather } from '@/lib/types';

export interface RouteWeatherParams {
  origin: string;
  destination: string;
  date: Date;
  time: string;
  earliestArrival?: string;
  enabled: boolean;
}

function formatDateInput(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function parseStartHour(time: string): number {
  const [hours] = time.split(':');
  return Number(hours) || 0;
}

function tripTimeToIso(dateStr: string, tripTime: string): string {
  const match = tripTime.match(/(\d{1,2})[h:](\d{2})/);
  if (!match) return `${dateStr}T00:00`;
  return `${dateStr}T${match[1].padStart(2, '0')}:${match[2]}`;
}

export function useRouteWeather(params: RouteWeatherParams) {
  const dateStr = formatDateInput(params.date);
  const startHour = parseStartHour(params.time);
  const forecastMode = startHour >= 5 && Boolean(params.earliestArrival);
  const originAt = forecastMode ? `${dateStr}T${params.time}` : undefined;
  const destinationAt =
    forecastMode && params.earliestArrival
      ? tripTimeToIso(dateStr, params.earliestArrival)
      : undefined;

  return useQuery<RouteWeather>({
    queryKey: [
      'transit',
      'route-weather',
      params.origin,
      params.destination,
      originAt,
      destinationAt,
    ],
    queryFn: async () => {
      const data = await fetchRouteWeather({
        origin: params.origin,
        destination: params.destination,
        originAt,
        destinationAt,
      });
      track('weather', 'view', {
        screen: 'transit_inline',
        mode: forecastMode ? 'forecast' : 'current',
      });
      return data;
    },
    enabled: params.enabled && Boolean(params.origin && params.destination),
  });
}
