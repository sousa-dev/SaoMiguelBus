import { staticIslandConfig } from '@/config/island';
import { logger } from '@/lib/logger';
import { getAnalyticsPlatform, getAppVersion } from '@/lib/platform';
import { getOrCreateSessionId } from '@/lib/session';
import type {
  BootstrapResponse,
  ConsentPurposes,
  DirectionsResponse,
  Stop,
  TransitSearchResult,
  TripDetail,
} from '@/lib/types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

function islandHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Island': staticIslandConfig.islandKey,
  };
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
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    logger.error('API ✗ network', method, url, error);
    throw error;
  }

  if (!response.ok) {
    const body = await response.text();
    logger.error('API ✗', response.status, method, url, body.slice(0, 300));
    throw new Error(`API ${response.status}: ${body}`);
  }

  logger.debug('API ←', response.status, method, url);
  return response.json() as Promise<T>;
}

export function getApiBase(): string {
  return API_BASE;
}

export async function fetchBootstrap(): Promise<BootstrapResponse> {
  return apiFetch<BootstrapResponse>('/api/v3/bootstrap');
}

export async function fetchStops(): Promise<Stop[]> {
  const data = await apiFetch<{ stops: Stop[] }>('/api/v3/transit/stops');
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
}): Promise<TransitSearchResult[]> {
  const query = new URLSearchParams(params);
  const data = await apiFetch<{ results: TransitSearchResult[] }>(
    `/api/v3/transit/search?${query.toString()}`,
  );
  return data.results;
}

export async function voteTrip(
  tripId: number,
  vote: 'like' | 'dislike' | 'undo_like' | 'undo_dislike' | 'switch_to_like',
): Promise<void> {
  await apiFetch(`/api/v3/transit/trips/${tripId}/vote`, {
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

export async function postConsent(sessionId: string, purposes: ConsentPurposes) {
  return apiFetch(`/api/v3/consent/`, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, purposes }),
  });
}

export async function postAnalyticsEvents(
  sessionId: string,
  events: { module: string; event_type: string; properties?: Record<string, unknown> }[],
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
