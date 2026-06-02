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
