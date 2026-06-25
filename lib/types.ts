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
  inAppReviewEnabled?: boolean;
  storeUrls?: {
    ios: string;
    android: string;
  };
  socialAuth?: {
    google: boolean;
    apple: boolean;
  };
  holidays: { id: number; date: string; name: string }[];
  infos: Record<string, unknown>[];
}

export type AppUpdateMode = 'optional' | 'required';

export interface AppUpdateCheckResponse {
  updateRequired: boolean;
  updateMode?: AppUpdateMode;
  currentVersion: string;
  clientVersion: string;
  storeUrl?: string;
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

export type UserType = 'tourist' | 'resident' | 'newcomer';

export type PersonalizationPlatform = 'ios' | 'android' | 'web';

export interface PersonaProfile {
  user_type: UserType;
  interests: string[];
  home_municipality: string;
  platform?: PersonalizationPlatform;
}

export interface PersonaProfileResponse {
  user_type: UserType | null;
  interests: string[];
  home_municipality: string;
  platform: PersonalizationPlatform | '';
  updated_at: string | null;
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

export interface DirectionsTimeValue {
  value?: number;
  text?: string;
}

export interface DirectionsStep {
  travel_mode: string;
  html_instructions?: string;
  duration?: { value: number; text: string };
  distance?: { value: number; text: string };
  polyline?: { points?: string };
  transit_details?: {
    line?: { short_name?: string; name?: string; color?: string; vehicle?: { type?: string } };
    departure_stop?: { name?: string };
    arrival_stop?: { name?: string };
    departure_time?: DirectionsTimeValue;
    arrival_time?: DirectionsTimeValue;
  };
}

export interface DirectionsLeg {
  duration?: { value: number; text: string };
  distance?: { value: number; text: string };
  departure_time?: DirectionsTimeValue;
  arrival_time?: DirectionsTimeValue;
  start_address?: string;
  end_address?: string;
  steps?: DirectionsStep[];
}

export interface DirectionsRoute {
  summary?: string;
  legs?: DirectionsLeg[];
  overview_polyline?: { points?: string };
}

export interface DirectionsResponse {
  routes?: DirectionsRoute[];
  warning?: string;
  error?: { code?: string; message?: string } | string;
}

export interface NewsSource {
  id: number;
  name: string;
  language: string;
  kind: string;
  defaultCategory: string;
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

export interface TourSummary {
  code: string;
  title: string;
  thumbnailUrl: string;
  rating: number | null;
  reviewCount: number | null;
  fromPrice: number | null;
  currency: string;
  durationMinutes: number | null;
  bookingUrl: string;
}

export interface TourImage {
  url: string;
  caption: string;
}

export interface TourDetail extends TourSummary {
  heroUrl: string;
  description: string;
  images: TourImage[];
  flags: string[];
}

export interface SeismicNearestIsland {
  key: string;
  name: string;
  distanceKm: number;
  bearing: string;
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
  nearestIsland?: SeismicNearestIsland | null;
  feltCount?: number;
  feltYesCount?: number;
  feltNoCount?: number;
  feltSummary?: Record<string, number>;
}

export interface SeismicFeltInput {
  felt: boolean;
  intensity?: number | null;
  latitude?: number;
  longitude?: number;
}

export interface FeltReportResponse {
  eventId: number;
  felt: boolean;
  intensity: number | null;
  feltCount: number;
  feltYesCount: number;
  feltNoCount: number;
  feltSummary: Record<string, number>;
}

export interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  icon: string;
  userSuggested?: boolean;
  isActive?: boolean;
}

export interface SocialLink {
  label: string;
  url: string;
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
  website?: string;
  socials?: SocialLink[];
  latitude: number | null;
  longitude: number | null;
  isPromoted: boolean;
  rating: number;
  reviewCount: number;
  status?: string;
  claimedOwner?: boolean;
  internalEmail?: string;
  internalPhone?: string;
  verifiedByOwner?: boolean;
}

export interface MarketplaceListMeta {
  reviewedShare: number;
  reviewedCount: number;
  totalCount: number;
}

export interface MarketplaceProvidersResult {
  providers: MarketplaceProvider[];
  meta: MarketplaceListMeta;
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
  category_name?: string;
  bio?: string;
  hourly_rate?: number | null;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  socials?: SocialLink[];
  claimed_owner?: boolean;
  internal_email?: string;
  internal_phone?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ProviderAdminWriteInput extends ProviderWriteInput {
  is_promoted?: boolean;
  verified_by_owner?: boolean;
  status?: string;
}

export interface ReviewAdminWriteInput {
  rating?: number;
  text?: string;
  status?: string;
}

export interface CategoryAdminWriteInput {
  name?: string;
  slug?: string;
  icon?: string;
  approve?: boolean;
}

export interface MarketplaceAdminQueue {
  pendingProviders: number;
  pendingReviews: number;
  suggestedCategories: number;
}

export interface MarketplaceAdminProvidersResult {
  providers: MarketplaceProvider[];
  total: number;
  limit: number;
  offset: number;
}

export interface MarketplaceAdminReviewsResult {
  reviews: MarketplaceAdminReview[];
  total: number;
  limit: number;
  offset: number;
}

export interface MarketplaceAdminReview extends MarketplaceReview {
  providerName: string;
}

export interface TrafficCategory {
  id: number;
  name: string;
  slug: string;
  icon: string;
  defaultTtlMinutes: number;
  isSchedulable: boolean;
  order: number;
}

export type TrafficReportStatus = 'active' | 'scheduled' | 'expired' | 'removed';

export interface TrafficReport {
  id: number;
  status: TrafficReportStatus;
  category: { id: number; name: string; slug: string; icon: string };
  latitude: number;
  longitude: number;
  description: string;
  road: string;
  confidence: { confirm: number; deny: number };
  activeFrom: string | null;
  activeUntil: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface TrafficReportWriteInput {
  category_slug: string;
  latitude: number;
  longitude: number;
  description?: string;
  road?: string;
  active_from?: string | null;
  active_until?: string | null;
}

export type ConfirmVote = 'still_there' | 'gone';

export type TrailGeoJson = {
  type: string;
  coordinates?: unknown;
};

export interface TrailSummary {
  id: number;
  sourceRef?: string;
  name: string;
  difficulty: string;
  distanceKm: number | null;
  shape?: string;
  durationMin?: number | null;
  mapImageUrl?: string;
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

export interface WeatherCurrent {
  temperature: number | null;
  weatherCode: number | null;
  windSpeed: number | null;
  humidity: number | null;
  precipitation: number | null;
  time: string | null;
}

export interface WeatherDaily {
  date: string;
  weatherCode: number | null;
  tempMax: number | null;
  tempMin: number | null;
  precipitationProbabilityMax: number | null;
}

export interface ParishWeather {
  slug: string;
  name: string;
  concelho: string;
  latitude: number;
  longitude: number;
  current: WeatherCurrent;
  daily: WeatherDaily[];
  attribution: string;
}

export interface WeatherParishesResponse {
  parishes: ParishWeather[];
  attribution: string;
}

export interface RouteWeatherCell {
  slug: string;
  name: string;
  concelho: string;
  at: string | null;
  source: 'current' | 'forecast';
  temperature: number | null;
  weatherCode: number | null;
  windSpeed: number | null;
  humidity: number | null;
  precipitation: number | null;
  precipitationProbability?: number | null;
  distanceKm?: number | null;
}

export interface RouteWeather {
  origin: RouteWeatherCell | null;
  destination: RouteWeatherCell | null;
}

export interface WeatherHourlySlot {
  time: string;
  temperature: number | null;
  weatherCode: number | null;
  windSpeed: number | null;
  humidity: number | null;
  precipitation: number | null;
  precipitationProbability: number | null;
}

export interface ParishWeatherHourly {
  slug: string;
  date: string;
  hours: WeatherHourlySlot[];
  attribution: string;
}

export interface MinibusServiceSummary {
  weekday?: { start: string; end: string };
  saturday_departures?: string[] | null;
}

export interface MinibusRouteShape {
  direction: number;
  encoded_polyline: string;
  journey_id?: string | null;
  source_vehicle_id?: string | null;
  captured_at?: string | null;
}

export interface MinibusLine {
  code: string;
  slug: string;
  name: string;
  color: string;
  sort_order: number;
  service_summary: MinibusServiceSummary;
  route_shapes?: MinibusRouteShape[];
  timetable_slug?: string | null;
  timetable_file_url?: string | null;
}

export interface MinibusTariff {
  key: string;
  label: string;
  price_eur: string;
  sort_order: number;
}

export interface MinibusDocument {
  slug: string;
  title: string;
  doc_type: 'timetable' | 'network_map' | 'tariffs' | 'schematic';
  line_code?: string | null;
  file_url?: string | null;
  has_file: boolean;
}

export interface MinibusMeta {
  attribution: string;
  source_url: string;
  imported_at?: string | null;
  tariffs_effective_date?: string | null;
  source_revision?: string;
}

export interface MinibusLinesResponse extends MinibusMeta {
  lines: MinibusLine[];
}

export interface MinibusTariffsResponse extends MinibusMeta {
  tariffs: MinibusTariff[];
}

export interface MinibusDocumentsResponse extends MinibusMeta {
  documents: MinibusDocument[];
}

export interface MinibusDocumentResponse extends MinibusDocument, MinibusMeta {}

// --- Network stops + route search --- //

export interface MinibusNetworkStop {
  sequence: number;
  key: string;
  name_pt: string;
  match_key: string;
  interchange_key: string;
  interchange_lines: string[];
  external_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface MinibusNetworkLine {
  code: string;
  slug: string;
  name: string;
  color: string | null;
  direction: string;
  stop_count: number;
  stops: MinibusNetworkStop[];
}

export interface MinibusNetwork {
  source?: string | null;
  extracted_at?: string | null;
  match_key_notes?: string | null;
  interchanges_by_key: Record<string, string[]>;
  lines: MinibusNetworkLine[];
}

export interface MinibusNetworkResponse extends MinibusNetwork, MinibusMeta {}

export interface MinibusStopRef {
  key: string;
  name: string;
  line_code: string;
  sequence: number;
  external_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface MinibusLeg {
  line_code: string;
  line_slug: string;
  line_name: string | null;
  line_color: string | null;
  board: MinibusStopRef;
  alight: MinibusStopRef;
  stops: MinibusStopRef[];
  num_stops: number;
  // Reserved for a later schedules feature; null until then.
  departure_time: string | null;
  arrival_time: string | null;
}

export interface MinibusTransferStop {
  name: string;
  from_line: string;
  to_line: string;
}

export interface MinibusJourney {
  transfers: number;
  total_stops: number;
  transfer_stops: MinibusTransferStop[];
  legs: MinibusLeg[];
}

export interface MinibusRouteEndpoint {
  query: string;
  name: string | null;
  matched: boolean;
}

export interface MinibusRouteSearchResponse extends MinibusMeta {
  origin: MinibusRouteEndpoint;
  destination: MinibusRouteEndpoint;
  journeys: MinibusJourney[];
}

// --- Offline bundle (ungated on-device snapshot) --- //

export interface MinibusOfflineImage {
  line_code: string;
  line_slug: string;
  slug: string | null;
  url: string | null;
}

export interface MinibusOfflineAsset {
  slug: string;
  url: string | null;
}

export interface MinibusOfflineBundle extends MinibusMeta {
  version: string;
  generated_at: string;
  lines: MinibusLine[];
  tariffs: MinibusTariff[];
  network: MinibusNetwork;
  images: MinibusOfflineImage[];
  network_map?: MinibusOfflineAsset | null;
}

export interface MinibusBundleVersionResponse {
  version: string;
}

// --- Live vehicle tracking (Eleven Systems AVL proxy) --- //

export interface MinibusTrackingMeta {
  cachedAt: string;
  stale: boolean;
  trackingCacheStatus?: 'hit' | 'miss' | 'stale';
  cacheMaxAgeSeconds: number;
  trackingAttribution: string;
  trackingSourceUrl: string;
  trackingUpstreamBaseUrl?: string;
}

export interface MinibusVehiclePosition {
  lat: number;
  lon: number;
}

export interface MinibusVehicleRoute {
  id?: string;
  name?: string;
  nameShort?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

export interface MinibusVehicleSummary {
  id: string;
  position: MinibusVehiclePosition;
  status: string;
  /** Fleet list includes color; detail responses may only expose route.color. */
  color?: string;
  route?: string | MinibusVehicleRoute | null;
  fleetId?: string | null;
}

export interface MinibusCirculationStagePosition {
  lat: number;
  lon: number;
}

export interface MinibusCirculationStage {
  id?: string;
  nameShort?: string;
  name?: string;
  position?: MinibusCirculationStagePosition;
}

export interface MinibusCirculation {
  sequence: number;
  stage?: MinibusCirculationStage;
  dueInMinutes?: number | null;
}

export interface MinibusVehicleJourney {
  shape?: string | null;
  circulations?: MinibusCirculation[];
}

export interface MinibusVehicleDetail extends MinibusVehicleSummary {
  currentStopSequence?: number | null;
  journey?: MinibusVehicleJourney | null;
}

export interface MinibusVehiclesResponse extends MinibusTrackingMeta, MinibusMeta {
  vehicles: MinibusVehicleSummary[];
}

export interface MinibusVehicleDetailResponse extends MinibusTrackingMeta, MinibusMeta {
  vehicle: MinibusVehicleDetail;
}

export interface MinibusTrackingHealthResponse extends MinibusMeta {
  available: boolean;
  checkedAt: string;
  recheckAfterSeconds: number;
  vehicleCount?: number;
  reason?: string;
}

// --- First-party ads (compat /api/v1/ad) --- //

/**
 * First-party SMB ad payload, shaped exactly as compat `GET /api/v1/ad` returns
 * it (snake_case fields preserved). `action === 'directions'` means `target` is
 * a place name to open in Maps; otherwise `target` is a plain URL.
 */
export interface AdPayload {
  id: number;
  entity: string;
  description: string;
  media: string;
  start: string | null;
  end: string | null;
  action: string | null;
  target: string | null;
  advertise_on?: string;
  platform?: string;
  status?: string;
  seen?: number;
  clicked?: number;
}

// --- Accounts & premium entitlement --- //

export type SocialProvider = 'apple' | 'google';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  dateJoined: string;
  isSuperuser?: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export type EntitlementTier = 'free' | 'premium';
export type EntitlementSource = 'legacy_email' | 'manual' | 'revenuecat' | 'stripe';
/** Where the user manages/cancels their subscription. */
export type ManageVia = 'app_store' | 'play_store' | 'stripe' | 'none';

export interface Entitlement {
  tier: EntitlementTier;
  source: EntitlementSource | null;
  status: string | null;
  currentPeriodEnd: string | null;
  features: string[];
  manageVia: ManageVia;
}
