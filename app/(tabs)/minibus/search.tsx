import { Redirect } from 'expo-router';

/**
 * The route planner now lives directly on the module's main screen. This stub
 * keeps old deep links (`saomiguelhub://minibus/search`) landing somewhere
 * useful instead of 404-ing.
 */
export default function MinibusSearchRedirect() {
  return <Redirect href="/(tabs)/minibus" />;
}
