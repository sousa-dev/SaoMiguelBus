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
  transitSchedule?: TransitScheduleConfig;
}

export type TransitDataset = 'legacy' | 'azoresbus';
export type SchedulePhase = 'preview' | 'live' | 'settled';

export interface TransitScheduleBanner {
  /** Dismissal key — changing it server-side re-shows the banner to everyone. */
  id: string;
  tone: 'info' | 'warning';
  dismissible: boolean;
  /** locale → copy. */
  text: Record<string, string>;
  /**
   * Optional per-phase overrides, merged over the fields above.
   *
   * The server sends one banner in every phase, but "preview the new timetables"
   * and "the new timetables are live" are different sentences. Editing the flag
   * by hand on the day would work and is precisely what the plan says must not be
   * necessary. The block is arbitrary JSON passed straight through, so this is a
   * config convention rather than an API change.
   */
  phases?: Partial<Record<SchedulePhase, Partial<TransitScheduleBanner>>>;
}

/**
 * `bootstrap.transitSchedule` — which network is active and when that stops
 * being true (00 Decision 1). The app renders it; it never computes it.
 *
 * Two things differ from the mobile plan's sketch, both confirmed against the
 * deployed API:
 *
 *  - The block is ALWAYS sent, even for an island with no azoresbus flags, with
 *    `cutoverAt: null` and `phase: 'preview'`. So `cutoverAt != null` is the
 *    "is this configured" test, not the presence of the block.
 *  - `banner` and `badge` are sent in every phase, so the phase gate is ours.
 *  - `trackingEnabled` lives in here, not at the top level of the bootstrap.
 */
export interface TransitScheduleConfig {
  activeDataset: TransitDataset;
  /** Non-null ⇒ offer the preview toggle. */
  previewDataset: TransitDataset | null;
  /** ISO INSTANT, or null when no cutover is armed. Never a calendar date. */
  cutoverAt: string | null;
  /** When this config stops being true, so a 24h-cached copy can be invalidated. */
  nextTransitionAt: string | null;
  phase: SchedulePhase;
  banner: TransitScheduleBanner | null;
  badge: { text: Record<string, string> } | null;
  trackingEnabled: boolean;
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

/**
 * The physical pole the server selected for boarding or alighting (02 §7.1b).
 * `sequence` is load-bearing, not decorative: the client slices on it instead of
 * re-matching names (98 B7). Absent on legacy-dataset results and older APIs.
 */
export interface StopRef {
  code: string;
  lat: number;
  lon: number;
  sequence: number;
  dayOffset: number;
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
  boarding?: StopRef;
  alighting?: StopRef;
  /**
   * False when the segment was rebuilt from a stop list the API had collapsed,
   * so the intermediate stops are approximate. Times always come from the
   * server's selected pair. Absent on the legacy name-matching path.
   */
  segmentExact?: boolean;
}

/**
 * One end of a ride, as the RIDER experiences it — where they get on or off, not
 * where the bus starts or finishes. `sequence` indexes into the trip's own stop
 * list and is load-bearing for the same reason `StopRef.sequence` is.
 */
export interface JourneyStopRef {
  name: string;
  time: string;
  sequence: number;
  dayOffset: number;
}

/** A ride on one bus. `route` keeps the `C` unconfirmed prefix the server sets. */
export interface TransitRideLeg {
  kind: 'ride';
  tripId: number;
  route: string;
  likesPercent: number;
  dislikesPercent: number;
  information: Record<string, unknown>;
  board: JourneyStopRef;
  alight: JourneyStopRef;
  /** Trimmed to board..alight — not the whole trip. */
  stops: TripStop[];
  boarding?: StopRef;
  alighting?: StopRef;
}

/**
 * The change itself, modelled as its own leg rather than a property of the ride
 * that follows. Getting off, waiting and walking is what the rider actually
 * does, and a flat alternating list is what the step UI renders.
 */
export interface TransitTransferLeg {
  kind: 'transfer';
  /** Where they board the next bus. */
  at: string;
  /** Where they got off — differs from `at` when the change involves a walk. */
  from: string;
  /** Full gap between getting off and the next departure, walk included. */
  waitMinutes: number;
  walkMinutes: number;
  /**
   * What is actually left once the walk is done — the number that says how
   * rushed the change is. A 12-minute wait with a 9-minute walk leaves 3.
   */
  slackMinutes: number;
  /** Slack below the comfortable threshold: worth warning the rider about. */
  tight: boolean;
  fromRoute: string;
  toRoute: string;
}

export type TransitJourneyLeg = TransitRideLeg | TransitTransferLeg;

/**
 * A whole itinerary: one bus, or two with a change between them.
 *
 * Not expressible as a `TransitSearchResult` — that type is inherently one line,
 * one boarding, one alighting, with a flat stop list that would walk straight
 * through the interchange as if the rider never got off.
 */
export interface TransitJourney {
  /** Synthetic — the joined trip ids. A multi-leg journey has no Trip row. */
  id: string;
  transfers: number;
  start: string;
  end: string;
  durationMinutes: number;
  /** Total time spent waiting at interchanges. 0 when direct. */
  waitMinutes: number;
  /** Day offset of the final arrival — drives the `+1` badge. */
  dayOffset: number;
  typeOfDay?: string;
  legs: TransitJourneyLeg[];
}

/**
 * A journey search's whole answer, not just its results.
 *
 * `transfersAvailable` is what makes the "no direct bus — try with a change?"
 * prompt honest: it is the number of itineraries a change WOULD find, computed
 * by the server, so the app never offers a retry that turns up nothing. Present
 * only when the search asked for direct-only AND found none.
 *
 * `earlierJourneysAvailable` is the same trade applied to `start`: the number
 * of itineraries a whole-day search WOULD find, computed client-side by
 * re-querying with `start=00h00`, so the app never tells a rider "no route
 * between these stops" when the truth is "not after the time you picked".
 * Present only when the search asked for a time after midnight AND found none.
 */
export interface TransitJourneySearch {
  journeys: TransitJourney[];
  /** Changes of bus this search allowed. 0 = one bus only. */
  maxTransfers: number;
  transfersAvailable?: number;
  earlierJourneysAvailable?: number;
}

/**
 * One stop as a map needs it: where it physically is.
 *
 * `lat`/`lon` are the POLE the trip serves when we know it, not the `Stop`
 * centroid — a centroid is the average of every pole sharing a name and can sit
 * in the middle of a road, on neither side. Absent on the legacy network, which
 * has no poles.
 */
export interface TransitGeometryStop {
  stopId: number;
  name: string;
  time: string;
  sequence: number;
  dayOffset: number;
  lat?: number;
  lon?: number;
  /** Pole code printed at the stop, e.g. "A 12". AzoresBus only. */
  code?: string;
}

/**
 * The drawable path and stop positions for ONE ride leg.
 *
 * `shape` is a Google-encoded polyline already trimmed to the segment the rider
 * travels, and is `''` whenever the server could not honestly draw the road —
 * no stored shape (every legacy trip), or a shape that does not match the stops.
 * An empty shape means "do not draw a line", never "draw a straight one".
 */
export interface TransitLegGeometry {
  tripId: number;
  route: string;
  shape: string;
  stops: TransitGeometryStop[];
}

/** One physical pole: the sign you actually stand at, and the code printed on it. */
export interface TransitStopPole {
  code: string;
  name: string;
  lat: number;
  lon: number;
}

export interface TransitStopDeparture {
  tripId: number;
  route: string;
  time: string;
  dayOffset: number;
  sequence: number;
  /**
   * Raw upstream journey name. On the live API this is a TIME RANGE
   * ("08:00 » 08:50"), not a headsign — do not show it to a rider.
   */
  headsign: string;
  /** The trip's final stop: the honest answer to "where is this bus going?". */
  destination?: string;
  /** Which pole this particular departure leaves from. */
  code?: string;
}

/**
 * A stop, answered the way someone standing near it would ask: where exactly is
 * it, what stops here, and when is the next one.
 *
 * `poles` is empty on the legacy network, which has no pole data — `lat`/`lon`
 * then fall back to the collapsed centroid.
 */
export interface TransitStopDetail {
  id: number;
  name: string;
  lat: number;
  lon: number;
  dataset: TransitDataset;
  poles: TransitStopPole[];
  lines: string[];
  departures: TransitStopDeparture[];
}

export interface TransitLineDirection {
  direction: number;
  /** Encoded polyline for the fullest trip in this direction. */
  shape: string;
  tripId: number;
  stops: TransitGeometryStop[];
}

export interface TransitLineShape {
  code: string;
  displayName: string;
  directions: TransitLineDirection[];
}

export function isRideLeg(leg: TransitJourneyLeg): leg is TransitRideLeg {
  return leg.kind === 'ride';
}

export function isTransferLeg(leg: TransitJourneyLeg): leg is TransitTransferLeg {
  return leg.kind === 'transfer';
}

export function journeyRideLegs(journey: TransitJourney): TransitRideLeg[] {
  return journey.legs.filter(isRideLeg);
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

// --- AzoresBus live vehicle tracking (Eleven Systems AVL proxy) --- //
//
// Same vendor as Mini Bus, DIFFERENT wire shape. Three traps worth stating
// before the types, because each one reads as a harmless copy-paste:
//
//   * There is NO cache metadata anywhere. Freshness is derived on the client
//     from react-query's `dataUpdatedAt` (see `freshnessFromQuery`), not read
//     off the response like minibus does.
//   * The detail endpoint returns the vehicle BARE. There is no `{vehicle: …}`
//     wrapper to unpack.
//   * On the LIST, `status` is PUNCTUALITY and `busStatus` is the movement
//     state. On the DETAIL, `status` carries the movement state instead.
//     Reading `status` for movement on a list item silently always says
//     "on time" -- it never throws, it just quietly lies.

export interface AzoresbusVehiclePosition {
  lat: number;
  lon: number;
}

/**
 * `nameShort` is the transit `Line.code` for the azoresbus dataset, so it joins
 * straight onto `/api/v3/transit/lines/<code>/shape` and the line detail screen.
 *
 * `color` is a SERVICE CLASS, not an identity: 49 of the 56 routes share
 * `2D59A9`. Never use it to tell one line from another.
 */
export interface AzoresbusRoute {
  id: string;
  nameShort: string;
  name: string;
  color: string;
}

export interface AzoresbusCirculationStage {
  id: string;
  /** The operator's own spelling, e.g. "P. DELGADA (ALFÂNDEGA)". */
  name: string;
  nameShort: string;
  /**
   * Our name for this stop, resolved server-side by joining the upstream stage
   * id against the stop table. Falls back to `name` when the join misses, so it
   * is always safe to display — prefer it over `name` everywhere.
   *
   * It is NOT `name` run through a formatter: the two feeds disagree outright
   * for about a fifth of stops (the operator's "CASA DA EIRA" is our
   * "Café Holandês"), so only the id join gives the right answer.
   */
  canonicalName?: string;
  /** Our `Stop.id`, for deep links. Null when the stop predates the last sync. */
  stopId?: number | null;
  position?: AzoresbusVehiclePosition;
}

export interface AzoresbusCirculation {
  sequence: number;
  stage: AzoresbusCirculationStage;
  /** Seconds since local midnight. */
  departureTime?: number | null;
  arrivalTime?: number | null;
  /** Present only from `currentStopSequence` onwards; null means "behind us". */
  dueInMinutes?: number | null;
}

export interface AzoresbusVehicleJourney {
  id: string;
  type: string;
  shape: string;
  /** e.g. "08:35 >> 09:05". */
  name?: string;
  start?: string;
  end?: string;
  startTime?: number | null;
  endTime?: number | null;
  direction?: number | null;
  isActive?: boolean | null;
  circulations?: AzoresbusCirculation[];
}

export interface AzoresbusVehicleSummary {
  id: string;
  position: AzoresbusVehiclePosition;
  /** Punctuality on the list, movement state on the detail. See note above. */
  status: string;
  /** Movement state. List only; '' when upstream omits it. */
  busStatus?: string;
  /** Seconds late; negative is early. */
  delay?: number | null;
  speed?: number | null;
  /** 6 hex digits, no leading '#'. Service class, not line identity. */
  color: string;
  /** Server-enriched from the route index; null until that index is warm. */
  route?: AzoresbusRoute | null;
}

export interface AzoresbusVehicleDetail extends AzoresbusVehicleSummary {
  fleetId: string;
  /** Empty for every vehicle in the live feed today -- do not build UI on it. */
  licensePlate: string;
  currentStopSequence: number | null;
  route: AzoresbusRoute;
  journey: AzoresbusVehicleJourney;
}

export interface AzoresbusVehiclesResponse {
  vehicles: AzoresbusVehicleSummary[];
}

/** The detail endpoint returns the vehicle itself -- there is no wrapper. */
export type AzoresbusVehicleDetailResponse = AzoresbusVehicleDetail;

export interface AzoresbusRoutesResponse {
  routes: AzoresbusRoute[];
}

/** One live bus inbound to a stop. */
export interface AzoresbusStopArrival {
  vehicleId: string;
  dueInMinutes: number;
  lineCode: string;
  lineName: string;
  lineColor: string;
  journeyId: string;
  /**
   * True when we could not re-read the vehicle and fell back to an aged
   * estimate. Show it as approximate rather than hiding the bus.
   */
  stale: boolean;
}

export interface AzoresbusStopArrivalsResponse {
  arrivals: AzoresbusStopArrival[];
}

export type AzoresbusTrackingStatus = 'ok' | 'disabled' | 'unavailable';

export interface AzoresbusTrackingHealthResponse {
  status: AzoresbusTrackingStatus;
  vehicles: number;
}

export type TransitTripLiveState = 'live' | 'not_found' | 'unsupported';

export interface TransitTripLiveNextStop {
  /** Same sequence space as the trip's stop times. */
  sequence: number | null;
  name: string;
  stopId: number | null;
  dueInMinutes: number;
}

export interface TransitTripLiveVehicle {
  id: string;
  position: AzoresbusVehiclePosition;
  /** Seconds late; negative is early; null when upstream omits it. */
  delaySeconds: number | null;
  speed: number | null;
  /** Movement state (`inTransitTo` / `idleAt` / `incomingAt`). */
  status: string;
  currentStopSequence: number | null;
  nextStop: TransitTripLiveNextStop | null;
  /** Every stop still ahead of the bus, nearest first. `nextStop` is `upcomingStops[0]`. */
  upcomingStops: TransitTripLiveNextStop[];
  /** When the fleet position was read. ISO 8601. */
  capturedAt: string;
  /** The detail could not be read: position is real, progress is unknown. */
  stale: boolean;
}

export interface TransitTripLive {
  tripId: number;
  state: TransitTripLiveState;
  vehicle: TransitTripLiveVehicle | null;
}

export interface TransitTripsLiveResponse {
  trips: TransitTripLive[];
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
