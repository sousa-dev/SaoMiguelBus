import type { MapMarkerOverlay } from '@/lib/map-overlays';
import type { AppTheme } from '@/lib/theme';
import type { TrafficReport } from '@/lib/types';

const CATEGORY_COLORS: Record<string, keyof AppTheme> = {
  acidente: 'danger',
  transito: 'warning',
  radar: 'secondary',
  policia: 'info',
  obras: 'accent',
  desvio: 'success',
  inundacao: 'info',
  perigo: 'danger',
  tempo: 'muted',
};

export function trafficMarkerOverlay(
  report: TrafficReport,
  theme: AppTheme,
  onPress?: () => void,
): MapMarkerOverlay {
  const colorKey = CATEGORY_COLORS[report.category.slug] ?? 'primary';
  return {
    id: `traffic-${report.id}`,
    latitude: report.latitude,
    longitude: report.longitude,
    pinColor: theme[colorKey] as string,
    onPress,
  };
}
