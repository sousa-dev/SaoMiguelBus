export interface BootstrapResponse {
  island: {
    key: string;
    name: string;
    defaultLocale: string;
    locales: string[];
    theme: {
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
    };
    mapCenter: { lat: number; lng: number };
    enabledModules: string[];
  };
  version: string;
  mapsEnabled: boolean;
  consentPolicyVersion: string;
  holidays: { id: number; date: string; name: string }[];
  infos: Record<string, unknown>[];
}

export interface Stop {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export interface TripStop {
  name: string;
  time: string;
  sequence?: number;
}

export interface TransitSearchResult {
  id: number;
  route: string;
  origin: string;
  destination: string;
  start: string;
  end: string;
  typeOfDay?: string;
  likesPercent: number;
  dislikesPercent: number;
  information: Record<string, unknown>;
  stops: TripStop[];
}

export interface ConsentPurposes {
  strictly_necessary: boolean;
  analytics: boolean;
  ads: boolean;
  personalization: boolean;
}

export interface TripDetail {
  id: number;
  route: string;
  typeOfDay?: string;
  likes: number;
  dislikes: number;
  information: Record<string, unknown>;
  stops: TripStop[];
  likesPercent?: number;
  dislikesPercent?: number;
}

export interface DirectionsStep {
  travel_mode: string;
  html_instructions?: string;
  duration?: { value: number; text: string };
  distance?: { value: number; text: string };
  transit_details?: {
    line?: { short_name?: string; name?: string };
    departure_stop?: { name?: string };
    arrival_stop?: { name?: string };
  };
}

export interface DirectionsLeg {
  duration?: { value: number; text: string };
  steps?: DirectionsStep[];
}

export interface DirectionsRoute {
  summary?: string;
  legs?: DirectionsLeg[];
}

export interface DirectionsResponse {
  routes?: DirectionsRoute[];
  warning?: string;
  error?: { code?: string; message?: string } | string;
}

export interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  link: string;
  publishedAt: string;
  category: string;
  source: {
    id: number;
    name: string;
    language: string;
  };
}

export interface SeismicEvent {
  id: number;
  emscId: string;
  magnitude: number;
  depthKm: number | null;
  latitude: number;
  longitude: number;
  occurredAt: string;
  region: string;
  feltCount?: number;
  feltSummary?: Record<string, number>;
}

export interface FeltReportResponse {
  eventId: number;
  intensity: number;
  feltCount: number;
  feltSummary: Record<string, number>;
}

export interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

export interface MarketplaceProvider {
  id: number;
  name: string;
  category: { id: number; name: string; slug: string };
  bio: string;
  hourlyRate: number | null;
  phone: string;
  whatsapp: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  isPromoted: boolean;
  rating: number;
  reviewCount: number;
  status?: string;
}

export interface MarketplaceReview {
  id: number;
  providerId: number;
  rating: number;
  text: string;
  createdAt: string;
  status: string;
}

export interface ProviderWriteInput {
  name?: string;
  category_slug?: string;
  bio?: string;
  hourly_rate?: number | null;
  phone?: string;
  whatsapp?: string;
  email?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export type TrailGeoJson = {
  type: string;
  coordinates?: unknown;
};

export interface TrailSummary {
  id: number;
  name: string;
  difficulty: string;
  distanceKm: number | null;
  shape?: string;
  durationMin?: number | null;
}

export interface TrailWaypoint {
  name: string;
  lat: number;
  lng: number;
}

export interface TrailNearestStop {
  name: string;
  distanceKm: number;
  lat: number;
  lng: number;
}

export interface TrailDetail extends TrailSummary {
  descriptionPt?: string;
  descriptionEn?: string;
  gpxUrl?: string;
  kmlUrl?: string;
  mapImageUrl?: string;
  leafletUrl?: string;
  startLat?: number | null;
  startLng?: number | null;
  waypoints?: TrailWaypoint[];
  nearestStop?: TrailNearestStop | null;
  geojson: TrailGeoJson;
  stages: {
    id: number;
    name: string;
    sequence: number;
    geojson: TrailGeoJson;
  }[];
  attribution: string;
}

export interface POIsListResponse {
  pois: {
    id: number;
    name: string;
    category: string;
    latitude: number;
    longitude: number;
  }[];
  attribution: string;
}

export interface TrailsListResponse {
  trails: TrailSummary[];
  attribution: string;
}
