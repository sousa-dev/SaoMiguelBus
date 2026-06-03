import { Alert, Platform, Share } from 'react-native';

import { track } from '@/lib/analytics';
import type { TransitSearchResult } from '@/lib/types';

/** Share a trip summary via the OS share sheet (used by ShareTripButton and FAB). */
export async function shareTrip(
  trip: TransitSearchResult,
  options?: { alertTitle?: string },
): Promise<void> {
  const message = `${trip.route}: ${trip.origin} → ${trip.destination} (${trip.start} – ${trip.end})`;
  track('transit', 'share', { trip_id: trip.id, route: trip.route });
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: trip.route, text: message });
      return;
    }
    await Share.share({ message, title: trip.route });
  } catch {
    if (Platform.OS === 'web' && options?.alertTitle) {
      Alert.alert(options.alertTitle, message);
    }
  }
}
