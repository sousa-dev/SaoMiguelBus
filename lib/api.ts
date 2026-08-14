import { staticIslandConfig } from '@/config/island';
import { resolvePublicTrackingUrl } from '@/features/minibus/lib/trackingAttribution';
import { buildAppUpdateCheckPath } from '@/lib/app-update-api';
import { ApiRequestError, parseApiErrorBody } from '@/lib/api-errors';
import { isWithinIslandBounds, saoMiguelMapBounds } from '@/lib/island-map';
import { getAuthToken, useAuthStore } from '@/lib/auth-store';
import { logger } from '@/lib/logger';
import { getAnalyticsPlatform, getAppVersion } from '@/lib/platform';
import { getOrCreateSessionId } from '@/lib/session';
import type {
  AdPayload,
  AuthResponse,
  AuthUser,
  Entitlement,
  SocialProvider,
  BootstrapResponse,
  AppUpdateCheckResponse,
  ConsentPurposes,
  PersonaProfile,
  PersonaProfileResponse,
  DirectionsResponse,
  Stop,
  TransitSearchResult,
  TripDetail,
  NewsArticle,
  NewsSource,
  TourSummary,
  TourDetail,
  SeismicEvent,
  FeltReportResponse,
  SeismicFeltInput,
  TrailsListResponse,
  TrailDetail,
  POIsListResponse,
  ServiceCategory,
  MarketplaceProvider,
  MarketplaceProvidersResult,
  MarketplaceReview,
  ProviderWriteInput,
  ProviderAdminWriteInput,
  ReviewAdminWriteInput,
  CategoryAdminWriteInput,
  MarketplaceAdminQueue,
  MarketplaceAdminProvidersResult,
  MarketplaceAdminReviewsResult,
  MarketplaceAdminReview,
  TrafficCategory,
  TrafficReport,
  TrafficReportWriteInput,
  ConfirmVote,
  WeatherParishesResponse,
  ParishWeather,
  ParishWeatherHourly,
  RouteWeather,
  MinibusLinesResponse,
  MinibusTariffsResponse,
  MinibusDocumentsResponse,
  MinibusLine,
  MinibusMeta,
  MinibusDocumentResponse,
  MinibusNetworkResponse,
  MinibusRouteSearchResponse,
  MinibusOfflineBundle,
  MinibusBundleVersionResponse,
  MinibusVehiclesResponse,
  MinibusVehicleDetailResponse,
  MinibusTrackingHealthResponse,
  TransitDataset,
} from '@/lib/types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

function islandHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Island': staticIslandConfig.islandKey,
  };
}

/** Authorization header for the signed-in user, if any. */
function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Token ${token}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET';
  const url = `${API_BASE}${path}`;
  logger.debug('API →', method, url);

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        ...islandHeaders(),
        ...authHeaders(),
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    logger.error('API ✗ network', method, url, error);
    throw error;
  }

  if (!response.ok) {
    // A 401 on a token-bearing request means the token is stale — drop the session.
    if (response.status === 401 && getAuthToken()) {
      void useAuthStore.getState().clearSession();
    }
    const body = await response.text();
    logger.error('API ✗', response.status, method, url, body.slice(0, 300));
    throw new ApiRequestError(response.status, body, parseApiErrorBody(body));
  }

  logger.debug('API ←', response.status, method, url);
  return response.json() as Promise<T>;
}

export function getApiBase(): string {
  return API_BASE;
}

// --- First-party ads (compat /api/v1/ad) --- //

/**
 * Fetch a first-party ad for a slot. Compat returns 404 when no ad is eligible;
 * we resolve `null` rather than throwing so callers render nothing (no error UI).
 */
export async function fetchAd(params: { on: string; platform: string }): Promise<AdPayload | null> {
  const query = new URLSearchParams({ on: params.on, platform: params.platform });
  const url = `${API_BASE}/api/v1/ad?${query.toString()}`;
  try {
    const response = await fetch(url, { headers: islandHeaders() });
    if (!response.ok) {
      // 404 (empty inventory) and any other non-2xx → no ad, no error UI.
      return null;
    }
    return (await response.json()) as AdPayload;
  } catch (error) {
    logger.warn('ad fetch failed', error);
    return null;
  }
}

/** Fire-and-forget ad click counter. Never throws. */
export async function recordAdClick(id: number): Promise<void> {
  const url = `${API_BASE}/api/v1/ad/click?id=${encodeURIComponent(String(id))}`;
  try {
    await fetch(url, { method: 'POST', headers: islandHeaders() });
  } catch (error) {
    logger.warn('ad click failed', error);
  }
}

// --- Accounts & premium entitlement --- //

export async function registerAccount(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/v3/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      display_name: input.displayName ?? '',
    }),
  });
}

export async function loginAccount(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/v3/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function socialAuth(input: {
  provider: SocialProvider;
  identityToken: string;
  nonce?: string;
  displayName?: string;
  /** Apple-only: native authorization code, used server-side to enable token revocation. */
  authorizationCode?: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/v3/auth/social', {
    method: 'POST',
    body: JSON.stringify({
      provider: input.provider,
      identity_token: input.identityToken,
      nonce: input.nonce,
      display_name: input.displayName ?? '',
      authorization_code: input.authorizationCode ?? '',
    }),
  });
}

export async function fetchMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/api/v3/auth/me');
}

export async function logoutAccount(): Promise<void> {
  await apiFetch<{ status: string }>('/api/v3/auth/logout', { method: 'POST' });
}

/** Permanently delete the signed-in user's account (App Store Guideline 5.1.1(v)). */
export async function deleteAccount(): Promise<void> {
  await apiFetch<{ status: string }>('/api/v3/auth/account', { method: 'DELETE' });
}

// --- GDPR / DSAR (data subject access requests) --- //

export interface DsarExportBundle {
  session_hash: string;
  consent: unknown[];
  analytics_events: unknown[];
  personalization?: unknown[];
  note?: string;
}

export interface DsarDeleteResult {
  session_hash: string;
  consent_records_deleted: number;
  analytics_events_anonymized: number;
  personalization_profiles_deleted?: number;
  note?: string;
}

/** Export the data this device's session has shared with the backend (consent + analytics). */
export async function exportMyData(sessionId: string): Promise<DsarExportBundle> {
  return apiFetch<DsarExportBundle>('/api/v3/privacy/dsar/export', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

/** Erase/anonymize the data this device's session has shared with the backend. */
export async function deleteMyData(sessionId: string): Promise<DsarDeleteResult> {
  return apiFetch<DsarDeleteResult>('/api/v3/privacy/dsar/delete', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export async function fetchEntitlement(): Promise<Entitlement> {
  return apiFetch<Entitlement>('/api/v3/billing/entitlement');
}

export async function fetchBootstrap(): Promise<BootstrapResponse> {
  return apiFetch<BootstrapResponse>('/api/v3/bootstrap');
}

export { buildAppUpdateCheckPath } from '@/lib/app-update-api';

export async function fetchAppUpdateCheck(params: {
  platform: 'ios' | 'android';
  version: string;
}): Promise<AppUpdateCheckResponse> {
  return apiFetch<AppUpdateCheckResponse>(buildAppUpdateCheckPath(params));
}

/** Legacy bulk payload for offline search (compat with SaoMiguelBus-webapp). */
export async function fetchWebappLoad(): Promise<unknown[]> {
  return apiFetch<unknown[]>('/api/v2/webapp/load');
}

export interface OfflineBundleVersionResponse {
  version: string;
  island: string;
}

export interface OfflineBundleStop {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export interface OfflineBundleRoute {
  id: number;
  route: string;
  stops: string[];
  times: string[];
  weekday: string;
  likes_percent?: number;
  dislikes_percent?: number;
  information?: Record<string, unknown> | string;
}

export interface OfflineBundleResponse {
  version: string;
  generatedAt: string;
  island: string;
  maps: boolean;
  counts: { stops: number; routes: number };
  stops: OfflineBundleStop[];
  holidays: { id: number; date: string; name: string }[];
  infos: Record<string, unknown>[];
  routes: OfflineBundleRoute[];
}

/** Lightweight staleness probe — poll before downloading the full bundle. */
export async function fetchOfflineBundleVersion(): Promise<OfflineBundleVersionResponse> {
  return apiFetch<OfflineBundleVersionResponse>('/api/v3/transit/offline-bundle/version');
}

/** Self-contained transit dataset for offline route search (v3). */
export async function fetchOfflineBundle(): Promise<OfflineBundleResponse> {
  return apiFetch<OfflineBundleResponse>('/api/v3/transit/offline-bundle');
}

export async function fetchStops(dataset?: TransitDataset | null): Promise<Stop[]> {
  // `dataset` is the preview toggle only. Never populated from a cached
  // activeDataset, and never `legacy` on a public URL (98 §4 gap).
  const query = dataset ? `?dataset=${encodeURIComponent(dataset)}` : '';
  const data = await apiFetch<{ stops: Stop[] }>(`/api/v3/transit/stops${query}`);
  const seen = new Set<number>();
  return data.stops.filter((stop) => {
    if (seen.has(stop.id)) {
      return false;
    }
    seen.add(stop.id);
    return true;
  });
}

export async function searchTransit(params: {
  origin: string;
  destination: string;
  day: string;
  start: string;
  dataset?: TransitDataset | null;
}): Promise<TransitSearchResult[]> {
  const { dataset, ...rest } = params;
  const query = new URLSearchParams(rest);
  if (dataset) {
    query.set('dataset', dataset);
  }
  const data = await apiFetch<{ results: TransitSearchResult[] }>(
    `/api/v3/transit/search?${query.toString()}`,
  );
  return data.results ?? [];
}

export async function voteTrip(
  tripId: number,
  vote: 'like' | 'dislike' | 'undo_like' | 'undo_dislike' | 'switch_to_like',
) {
  return apiFetch<TripDetail>(`/api/v3/transit/trips/${tripId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ vote }),
  });
}

export async function fetchConsent(sessionId: string) {
  return apiFetch<{
    purposes: ConsentPurposes;
    policy_version: string;
    granted_at: string | null;
  }>(`/api/v3/consent/?session_id=${encodeURIComponent(sessionId)}`);
}

export async function fetchTripDetail(tripId: number): Promise<TripDetail> {
  return apiFetch<TripDetail>(`/api/v3/transit/trips/${tripId}`);
}

export async function fetchDirections(params: {
  origin: string;
  destination: string;
  day: string;
  start: string;
  locale?: string;
}): Promise<DirectionsResponse> {
  const sessionId = await getOrCreateSessionId();
  const query = new URLSearchParams({
    origin: params.origin,
    destination: params.destination,
    day: params.day,
    start: params.start,
    session_id: sessionId,
    locale: params.locale ?? 'pt',
  });
  return apiFetch<DirectionsResponse>(`/api/v3/transit/directions?${query.toString()}`);
}

export async function fetchNewsSources(): Promise<NewsSource[]> {
  const data = await apiFetch<{ sources: NewsSource[] }>('/api/v3/news/sources');
  return data.sources;
}

export async function fetchNewsArticles(params?: {
  category?: string;
  source?: number;
  q?: string;
  limit?: number;
}): Promise<NewsArticle[]> {
  const query = new URLSearchParams();
  if (params?.category) {
    query.set('category', params.category);
  }
  if (params?.source) {
    query.set('source', String(params.source));
  }
  if (params?.q) {
    query.set('q', params.q);
  }
  if (params?.limit) {
    query.set('limit', String(params.limit));
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const data = await apiFetch<{ articles: NewsArticle[] }>(`/api/v3/news/articles${suffix}`);
  return data.articles;
}

export async function fetchNewsArticle(articleId: number): Promise<NewsArticle> {
  return apiFetch<NewsArticle>(`/api/v3/news/articles/${articleId}`);
}

export async function fetchTours(params?: {
  locale?: string;
  currency?: string;
  limit?: number;
}): Promise<TourSummary[]> {
  const query = new URLSearchParams();
  if (params?.locale) {
    query.set('locale', params.locale);
  }
  if (params?.currency) {
    query.set('currency', params.currency);
  }
  if (params?.limit) {
    query.set('limit', String(params.limit));
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const data = await apiFetch<{ tours: TourSummary[] }>(`/api/v3/events/tours${suffix}`);
  return data.tours;
}

export async function fetchTour(
  code: string,
  params?: { locale?: string; currency?: string },
): Promise<TourDetail> {
  const query = new URLSearchParams();
  if (params?.locale) {
    query.set('locale', params.locale);
  }
  if (params?.currency) {
    query.set('currency', params.currency);
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<TourDetail>(`/api/v3/events/tours/${encodeURIComponent(code)}${suffix}`);
}

export async function fetchWeatherParishes(): Promise<WeatherParishesResponse> {
  return apiFetch<WeatherParishesResponse>('/api/v3/weather/parishes');
}

export async function fetchWeatherParish(slug: string): Promise<ParishWeather> {
  return apiFetch<ParishWeather>(`/api/v3/weather/parishes/${encodeURIComponent(slug)}`);
}

export async function fetchWeatherParishHourly(
  slug: string,
  date: string,
): Promise<ParishWeatherHourly> {
  const query = new URLSearchParams({ date });
  return apiFetch<ParishWeatherHourly>(
    `/api/v3/weather/parishes/${encodeURIComponent(slug)}/hourly?${query.toString()}`,
  );
}

export async function fetchRouteWeather(params: {
  origin: string;
  destination: string;
  originAt?: string;
  destinationAt?: string;
}): Promise<RouteWeather> {
  const query = new URLSearchParams({
    origin: params.origin,
    destination: params.destination,
  });
  if (params.originAt) query.set('origin_at', params.originAt);
  if (params.destinationAt) query.set('destination_at', params.destinationAt);
  return apiFetch<RouteWeather>(`/api/v3/transit/route-weather?${query.toString()}`);
}

function minibusQuery(locale?: string): string {
  const query = new URLSearchParams();
  if (locale) {
    query.set('locale', locale);
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export async function fetchMinibusLines(params?: { locale?: string }): Promise<MinibusLinesResponse> {
  return apiFetch<MinibusLinesResponse>(`/api/v3/minibus/lines${minibusQuery(params?.locale)}`);
}

export async function fetchMinibusLine(
  slug: string,
  params?: { locale?: string },
): Promise<MinibusLine & MinibusMeta> {
  return apiFetch<MinibusLine & MinibusMeta>(
    `/api/v3/minibus/lines/${encodeURIComponent(slug)}${minibusQuery(params?.locale)}`,
  );
}

export async function fetchMinibusTariffs(params?: { locale?: string }): Promise<MinibusTariffsResponse> {
  return apiFetch<MinibusTariffsResponse>(`/api/v3/minibus/tariffs${minibusQuery(params?.locale)}`);
}

export async function fetchMinibusDocuments(params?: {
  locale?: string;
}): Promise<MinibusDocumentsResponse> {
  return apiFetch<MinibusDocumentsResponse>(`/api/v3/minibus/documents${minibusQuery(params?.locale)}`);
}

export async function fetchMinibusSchematic(params?: {
  locale?: string;
}): Promise<MinibusDocumentResponse> {
  return apiFetch<MinibusDocumentResponse>(`/api/v3/minibus/schematic${minibusQuery(params?.locale)}`);
}

export async function fetchMinibusNetwork(params?: {
  locale?: string;
}): Promise<MinibusNetworkResponse> {
  return apiFetch<MinibusNetworkResponse>(`/api/v3/minibus/network${minibusQuery(params?.locale)}`);
}

export async function fetchMinibusRoute(params: {
  origin: string;
  destination: string;
  locale?: string;
}): Promise<MinibusRouteSearchResponse> {
  const query = new URLSearchParams({ origin: params.origin, destination: params.destination });
  if (params.locale) {
    query.set('locale', params.locale);
  }
  return apiFetch<MinibusRouteSearchResponse>(`/api/v3/minibus/route?${query.toString()}`);
}

export async function fetchMinibusOfflineBundle(params?: {
  locale?: string;
}): Promise<MinibusOfflineBundle> {
  return apiFetch<MinibusOfflineBundle>(`/api/v3/minibus/offline-bundle${minibusQuery(params?.locale)}`);
}

export async function fetchMinibusBundleVersion(): Promise<MinibusBundleVersionResponse> {
  return apiFetch<MinibusBundleVersionResponse>(`/api/v3/minibus/offline-bundle/version`);
}

export async function fetchMinibusVehicles(): Promise<MinibusVehiclesResponse> {
  const data = await apiFetch<MinibusVehiclesResponse>(`/api/v3/minibus/vehicles`);
  return {
    ...data,
    trackingSourceUrl: resolvePublicTrackingUrl(data.trackingSourceUrl),
  };
}

export async function fetchMinibusTrackingHealth(options?: {
  force?: boolean;
}): Promise<MinibusTrackingHealthResponse> {
  const query = options?.force ? '?force=1' : '';
  return apiFetch<MinibusTrackingHealthResponse>(`/api/v3/minibus/tracking/health${query}`);
}

export async function fetchMinibusVehicle(trackingId: string): Promise<MinibusVehicleDetailResponse> {
  const data = await apiFetch<MinibusVehicleDetailResponse>(
    `/api/v3/minibus/vehicles/${encodeURIComponent(trackingId)}`,
  );
  return {
    ...data,
    trackingSourceUrl: resolvePublicTrackingUrl(data.trackingSourceUrl),
  };
}

export async function fetchSeismicEvents(params?: {
  minMagnitude?: number;
  sinceHours?: number;
  limit?: number;
}): Promise<SeismicEvent[]> {
  const query = new URLSearchParams();
  if (params?.minMagnitude !== undefined) {
    query.set('min_magnitude', String(params.minMagnitude));
  }
  if (params?.sinceHours !== undefined) {
    query.set('since_hours', String(params.sinceHours));
  }
  if (params?.limit) {
    query.set('limit', String(params.limit));
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const data = await apiFetch<{ events: SeismicEvent[] }>(`/api/v3/seismic/events${suffix}`);
  return data.events;
}

export async function fetchSeismicEvent(eventId: number): Promise<SeismicEvent> {
  return apiFetch<SeismicEvent>(`/api/v3/seismic/events/${eventId}`);
}

export async function postSeismicFelt(
  eventId: number,
  payload: SeismicFeltInput & { session_id: string },
): Promise<FeltReportResponse> {
  return apiFetch<FeltReportResponse>(`/api/v3/seismic/events/${eventId}/felt`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchTrails(params?: {
  difficulty?: string;
  shape?: string;
  minLength?: number;
  maxLength?: number;
  limit?: number;
}): Promise<TrailsListResponse> {
  const query = new URLSearchParams();
  if (params?.difficulty) {
    query.set('difficulty', params.difficulty);
  }
  if (params?.shape) {
    query.set('shape', params.shape);
  }
  if (params?.minLength != null) {
    query.set('min_length', String(params.minLength));
  }
  if (params?.maxLength != null) {
    query.set('max_length', String(params.maxLength));
  }
  if (params?.limit) {
    query.set('limit', String(params.limit));
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<TrailsListResponse>(`/api/v3/trails/${suffix}`);
}

export async function fetchPOIs(params?: {
  category?: string;
  limit?: number;
}): Promise<POIsListResponse> {
  const query = new URLSearchParams();
  if (params?.category) {
    query.set('category', params.category);
  }
  if (params?.limit) {
    query.set('limit', String(params.limit));
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<POIsListResponse>(`/api/v3/trails/pois${suffix}`);
}

export async function fetchTrail(trailId: number): Promise<TrailDetail> {
  return apiFetch<TrailDetail>(`/api/v3/trails/${trailId}`);
}

// --------------------------------------------------------------------------- //
// Marketplace
// --------------------------------------------------------------------------- //

export async function fetchMarketplaceCategories(): Promise<ServiceCategory[]> {
  const data = await apiFetch<{ categories: ServiceCategory[] }>('/api/v3/marketplace/categories');
  return data.categories;
}

export async function fetchProviders(params?: {
  category?: string;
  q?: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
  min_rating?: number;
  has_rate?: boolean;
  verified?: boolean;
  sort?: string;
  limit?: number;
}): Promise<MarketplaceProvidersResult> {
  const query = new URLSearchParams();
  if (params?.category) {
    query.set('category', params.category);
  }
  if (params?.q) {
    query.set('q', params.q);
  }
  if (params?.lat != null && params?.lng != null) {
    query.set('lat', String(params.lat));
    query.set('lng', String(params.lng));
  }
  if (params?.radius_km != null) {
    query.set('radius_km', String(params.radius_km));
  }
  if (params?.min_rating != null) {
    query.set('min_rating', String(params.min_rating));
  }
  if (params?.has_rate) {
    query.set('has_rate', 'true');
  }
  if (params?.verified) {
    query.set('verified', 'true');
  }
  if (params?.sort) {
    query.set('sort', params.sort);
  }
  if (params?.limit) {
    query.set('limit', String(params.limit));
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<MarketplaceProvidersResult>(
    `/api/v3/marketplace/providers${suffix}`,
  );
}

export async function fetchProvider(providerId: number): Promise<MarketplaceProvider> {
  const sessionId = await getOrCreateSessionId();
  return apiFetch<MarketplaceProvider>(`/api/v3/marketplace/providers/${providerId}`, {
    headers: { 'X-Session-Id': sessionId },
  });
}

export async function createProvider(input: ProviderWriteInput): Promise<MarketplaceProvider> {
  const sessionId = await getOrCreateSessionId();
  return apiFetch<MarketplaceProvider>('/api/v3/marketplace/providers', {
    method: 'POST',
    headers: { 'X-Session-Id': sessionId },
    body: JSON.stringify({ ...input, session_id: sessionId }),
  });
}

export async function updateProvider(
  providerId: number,
  input: ProviderWriteInput,
): Promise<MarketplaceProvider> {
  const sessionId = await getOrCreateSessionId();
  return apiFetch<MarketplaceProvider>(`/api/v3/marketplace/providers/${providerId}`, {
    method: 'PATCH',
    headers: { 'X-Session-Id': sessionId },
    body: JSON.stringify({ ...input, session_id: sessionId }),
  });
}

export async function deleteProvider(providerId: number): Promise<void> {
  const sessionId = await getOrCreateSessionId();
  await apiFetch(`/api/v3/marketplace/providers/${providerId}`, {
    method: 'DELETE',
    headers: { 'X-Session-Id': sessionId },
  });
}

export async function fetchReviews(providerId: number): Promise<MarketplaceReview[]> {
  const data = await apiFetch<{ reviews: MarketplaceReview[] }>(
    `/api/v3/marketplace/providers/${providerId}/reviews`,
  );
  return data.reviews;
}

export async function submitReview(
  providerId: number,
  payload: { rating: number; text?: string },
): Promise<MarketplaceReview> {
  const sessionId = await getOrCreateSessionId();
  return apiFetch<MarketplaceReview>(`/api/v3/marketplace/providers/${providerId}/reviews`, {
    method: 'POST',
    headers: { 'X-Session-Id': sessionId },
    body: JSON.stringify({ ...payload, session_id: sessionId }),
  });
}

// --------------------------------------------------------------------------- //
// Marketplace admin (superuser only)
// --------------------------------------------------------------------------- //

export async function fetchMarketplaceAdminQueue(): Promise<MarketplaceAdminQueue> {
  return apiFetch<MarketplaceAdminQueue>('/api/v3/marketplace/admin/queue');
}

export async function fetchMarketplaceAdminProviders(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<MarketplaceAdminProvidersResult> {
  const query = new URLSearchParams();
  if (params?.status) {
    query.set('status', params.status);
  }
  if (params?.limit != null) {
    query.set('limit', String(params.limit));
  }
  if (params?.offset != null) {
    query.set('offset', String(params.offset));
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<MarketplaceAdminProvidersResult>(`/api/v3/marketplace/admin/providers${suffix}`);
}

export async function fetchMarketplaceAdminReviews(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<MarketplaceAdminReviewsResult> {
  const query = new URLSearchParams();
  if (params?.status) {
    query.set('status', params.status);
  }
  if (params?.limit != null) {
    query.set('limit', String(params.limit));
  }
  if (params?.offset != null) {
    query.set('offset', String(params.offset));
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<MarketplaceAdminReviewsResult>(`/api/v3/marketplace/admin/reviews${suffix}`);
}

export async function fetchMarketplaceAdminCategories(): Promise<ServiceCategory[]> {
  const data = await apiFetch<{ categories: ServiceCategory[] }>(
    '/api/v3/marketplace/admin/categories?suggested=1',
  );
  return data.categories;
}

export async function moderateMarketplaceProviderAdmin(
  providerId: number,
  action: 'publish' | 'reject',
): Promise<MarketplaceProvider> {
  return apiFetch<MarketplaceProvider>(
    `/api/v3/marketplace/admin/providers/${providerId}/moderate`,
    {
      method: 'POST',
      body: JSON.stringify({ action }),
    },
  );
}

export async function moderateMarketplaceReviewAdmin(
  reviewId: number,
  action: 'publish' | 'reject',
): Promise<MarketplaceReview> {
  return apiFetch<MarketplaceReview>(`/api/v3/marketplace/admin/reviews/${reviewId}/moderate`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

export async function updateMarketplaceProviderAdmin(
  providerId: number,
  input: ProviderAdminWriteInput,
): Promise<MarketplaceProvider> {
  return apiFetch<MarketplaceProvider>(`/api/v3/marketplace/admin/providers/${providerId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function updateMarketplaceReviewAdmin(
  reviewId: number,
  input: ReviewAdminWriteInput,
): Promise<MarketplaceAdminReview> {
  return apiFetch<MarketplaceAdminReview>(`/api/v3/marketplace/admin/reviews/${reviewId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function updateMarketplaceCategoryAdmin(
  categoryId: number,
  input: CategoryAdminWriteInput,
): Promise<ServiceCategory> {
  return apiFetch<ServiceCategory>(`/api/v3/marketplace/admin/categories/${categoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// --------------------------------------------------------------------------- //
// Traffic
// --------------------------------------------------------------------------- //

export async function fetchTrafficCategories(): Promise<TrafficCategory[]> {
  const data = await apiFetch<{ categories: TrafficCategory[] }>('/api/v3/traffic/categories');
  return data.categories;
}

export async function fetchTrafficReports(params?: {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  bbox?: [number, number, number, number];
  category?: string;
  includeScheduled?: boolean;
  limit?: number;
}): Promise<TrafficReport[]> {
  const query = new URLSearchParams();
  if (params?.lat != null && params?.lng != null && params?.radiusKm != null) {
    query.set('lat', String(params.lat));
    query.set('lng', String(params.lng));
    query.set('radius_km', String(params.radiusKm));
  }
  if (params?.bbox) {
    query.set('bbox', params.bbox.join(','));
  }
  if (params?.category) {
    query.set('category', params.category);
  }
  if (params?.includeScheduled) {
    query.set('include_scheduled', 'true');
  }
  if (params?.limit) {
    query.set('limit', String(params.limit));
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const data = await apiFetch<{ reports: TrafficReport[] }>(`/api/v3/traffic/reports${suffix}`);
  return data.reports;
}

export async function fetchTrafficReport(reportId: number): Promise<TrafficReport> {
  const sessionId = await getOrCreateSessionId();
  return apiFetch<TrafficReport>(`/api/v3/traffic/reports/${reportId}`, {
    headers: { 'X-Session-Id': sessionId },
  });
}

export async function createTrafficReport(
  input: TrafficReportWriteInput,
): Promise<TrafficReport> {
  const sessionId = await getOrCreateSessionId();
  return apiFetch<TrafficReport>('/api/v3/traffic/reports', {
    method: 'POST',
    headers: { 'X-Session-Id': sessionId },
    body: JSON.stringify({ ...input, session_id: sessionId }),
  });
}

export async function deleteTrafficReport(reportId: number): Promise<void> {
  const sessionId = await getOrCreateSessionId();
  await apiFetch(`/api/v3/traffic/reports/${reportId}`, {
    method: 'DELETE',
    headers: { 'X-Session-Id': sessionId },
  });
}

export type PlaceResult = { name: string; lat: number; lng: number };

/**
 * Forward-geocode a free-text query to coordinates, bounded to São Miguel.
 * Uses the public OpenStreetMap Nominatim service (matches the OSM map we render).
 * Results outside the island bounds are dropped as a safety net.
 */
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 3) {
    return [];
  }
  const { southWest, northEast } = saoMiguelMapBounds;
  // Nominatim viewbox order: west, north, east, south.
  const viewbox = `${southWest.lng},${northEast.lat},${northEast.lng},${southWest.lat}`;
  const params = new URLSearchParams({
    format: 'jsonv2',
    countrycodes: 'pt',
    bounded: '1',
    viewbox,
    limit: '6',
    q,
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      'User-Agent': `SaoMiguelBus/${getAppVersion()} (https://saomiguelbus.com)`,
      'Accept-Language': 'pt',
    },
  });
  if (!response.ok) {
    throw new ApiRequestError(response.status, '', { code: 'nominatim_error' });
  }
  const data = (await response.json()) as { display_name?: string; lat?: string; lon?: string }[];
  return data
    .map((item) => ({
      name: item.display_name ?? '',
      lat: Number(item.lat),
      lng: Number(item.lon),
    }))
    .filter(
      (p) => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lng) && isWithinIslandBounds(p.lat, p.lng),
    );
}

export async function confirmTrafficReport(
  reportId: number,
  vote: ConfirmVote,
): Promise<TrafficReport> {
  const sessionId = await getOrCreateSessionId();
  return apiFetch<TrafficReport>(`/api/v3/traffic/reports/${reportId}/confirm`, {
    method: 'POST',
    headers: { 'X-Session-Id': sessionId },
    body: JSON.stringify({ session_id: sessionId, vote }),
  });
}

export async function postConsent(sessionId: string, purposes: ConsentPurposes) {
  return apiFetch(`/api/v3/consent/`, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, purposes }),
  });
}

export async function postPersonalization(sessionId: string, profile: PersonaProfile) {
  return apiFetch<PersonaProfileResponse>(`/api/v3/personalization/`, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, ...profile }),
  });
}

export async function fetchPersonalization(sessionId: string) {
  return apiFetch<PersonaProfileResponse>(
    `/api/v3/personalization/?session_id=${encodeURIComponent(sessionId)}`,
  );
}

export async function postAnalyticsEvents(
  sessionId: string,
  events: {
    module: string;
    event_type: string;
    properties?: Record<string, unknown>;
    occurred_at?: string;
  }[],
) {
  return apiFetch<{ accepted: number; dropped: number }>('/api/v3/analytics/events', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      platform: getAnalyticsPlatform(),
      app_version: getAppVersion(),
      events,
    }),
  });
}
