import type { LucideIcon } from 'lucide-react-native';
import {
  AlertTriangle,
  Camera,
  Car,
  CloudRain,
  Construction,
  Gauge,
  Route,
  Shield,
  Signpost,
  Waves,
  Wrench,
} from 'lucide-react-native';

const TRAFFIC_CATEGORY_ICONS: Record<string, LucideIcon> = {
  acidente: Car,
  transito: Gauge,
  radar: Camera,
  policia: Shield,
  obras: Construction,
  desvio: Route,
  inundacao: Waves,
  perigo: AlertTriangle,
  tempo: CloudRain,
};

export function trafficCategoryIcon(slug: string | undefined): LucideIcon {
  if (!slug) {
    return AlertTriangle;
  }
  return TRAFFIC_CATEGORY_ICONS[slug] ?? Wrench;
}
