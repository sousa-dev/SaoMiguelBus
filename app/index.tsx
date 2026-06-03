import { Redirect } from 'expo-router';

import { resolveEnabledModules } from '@/config/island';
import { useBootstrapCached } from '@/features/transit/hooks/useTransitQueries';
import { landingPageToHref, resolveLandingPageKey } from '@/lib/landing-page';
import { useHubStore } from '@/lib/hub-store';

export default function Index() {
  const landingPageKey = useHubStore((s) => s.landingPageKey);
  const { data: bootstrap } = useBootstrapCached();
  const enabledKeys = resolveEnabledModules(bootstrap?.island?.enabledModules);
  const resolved = resolveLandingPageKey(landingPageKey, enabledKeys);

  return <Redirect href={landingPageToHref(resolved)} />;
}
