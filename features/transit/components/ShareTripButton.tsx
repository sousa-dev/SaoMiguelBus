import { Share2 } from 'lucide-react-native';
import { Alert, Platform, Share } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';
import type { TransitSearchResult } from '@/lib/types';

type Props = {
  trip: TransitSearchResult;
};

export function ShareTripButton({ trip }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const onShare = async () => {
    const message = `${trip.route}: ${trip.origin} → ${trip.destination} (${trip.start} – ${trip.end})`;
    track('transit', 'share', { trip_id: trip.id, route: trip.route });
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: trip.route, text: message });
        return;
      }
      await Share.share({ message, title: trip.route });
    } catch {
      if (Platform.OS === 'web') {
        Alert.alert(t('transitShareTitle'), message);
      }
    }
  };

  return (
    <IconButton
      icon={Share2}
      variant="ghost"
      color={theme.muted}
      accessibilityLabel={t('transitShareTrip')}
      onPress={() => void onShare()}
    />
  );
}
