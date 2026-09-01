import type { useRouter } from 'expo-router';

/** expo-router types hrefs as a union of known routes, not a bare string. */
export type LiveHref = Parameters<ReturnType<typeof useRouter>['push']>[0];

/**
 * Build a `?line=` href, omitting the param when nothing is selected.
 *
 * Deliberately kept in its own module, free of any `react-native` import, so it
 * stays loadable under the node test runner -- `openLiveTracking` pulls in
 * `InteractionManager` and cannot be imported from a test.
 *
 * The cast is confined here, to the one place that knows the result is a real
 * route, rather than repeated at every call site.
 */
export function liveMapHref(basePath: string, line?: string | null): LiveHref {
  const href =
    line != null && line.length > 0
      ? `${basePath}?line=${encodeURIComponent(line)}`
      : basePath;
  return href as LiveHref;
}
