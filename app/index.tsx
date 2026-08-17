import { Redirect } from 'expo-router';

import { resolveEnabledModules } from '@/config/island';
import { useBootstrapCached } from '@/features/transit/hooks/useTransitQueries';
import { landingPageToHref, resolveLandingPageKey } from '@/lib/landing-page';

/** App always opens on the Bus (transit) tab; landing page is not user-configurable. */
export default function Index() {
  const { data: bootstrap } = useBootstrapCached();
  const enabledKeys = resolveEnabledModules(bootstrap?.island?.enabledModules);
  const resolved = resolveLandingPageKey(undefined, enabledKeys);

  return <Redirect href={landingPageToHref(resolved)} />;
}
