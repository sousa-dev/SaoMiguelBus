import { useQuery } from '@tanstack/react-query';

type OpenMeteoResponse = {
  current?: { temperature_2m?: number; weather_code?: number };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

export function useTrailWeather(lat?: number | null, lng?: number | null, enabled = true) {
  return useQuery({
    queryKey: ['trails', 'weather', lat, lng],
    queryFn: async () => {
      if (lat == null || lng == null) {
        throw new Error('missing coords');
      }
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('weather fetch failed');
      }
      return (await response.json()) as OpenMeteoResponse;
    },
    enabled: enabled && lat != null && lng != null,
    staleTime: 1000 * 60 * 15,
  });
}
