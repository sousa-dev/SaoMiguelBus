/**
 * How often to re-ask for the fleet.
 *
 * A constant, not a server-driven value: AzoresBus sends no cache metadata, so
 * there is nothing to read. It matches the server's own fleet cache TTL
 * (`AZORESBUS_TRACKING_CACHE_TTL`) -- polling faster returns the same bytes,
 * polling slower wastes freshness already paid for -- so the two must be
 * changed together.
 *
 * A minute rather than ten seconds: every poll is an upstream round trip
 * through the proxy for the whole fleet, and a bus covers little enough ground
 * in a minute that the map stays honest. It also cuts the request rate on the
 * vendor by six.
 *
 * If the API ever grows cache meta, this is the one place to change.
 */
export const AZORESBUS_TRACKING_POLL_MS = 60_000;

export function azoresbusTrackingPollIntervalMs(): number {
  return AZORESBUS_TRACKING_POLL_MS;
}

export function azoresbusTrackingStaleTimeMs(): number {
  return AZORESBUS_TRACKING_POLL_MS;
}
