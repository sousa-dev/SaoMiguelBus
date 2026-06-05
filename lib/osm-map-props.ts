import { PROVIDER_DEFAULT } from 'react-native-maps';

/** iOS MapView props — Apple Maps default basemap. Android maps use Leaflet WebView instead. */
export function osmMapViewProps() {
  return {
    provider: PROVIDER_DEFAULT,
    mapType: 'standard' as const,
  };
}
