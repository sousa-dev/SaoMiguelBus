import { Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { shareTrip } from '@/features/transit/share-trip';
import { useAppTheme } from '@/lib/theme';
import type { TransitSearchResult } from '@/lib/types';

type Props = {
  trip: TransitSearchResult;
};

export function ShareTripButton({ trip }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <IconButton
      icon={Share2}
      variant="ghost"
      color={theme.muted}
      accessibilityLabel={t('transitShareTrip')}
      onPress={() => void shareTrip(trip, { t, alertTitle: t('transitShareTitle') })}
    />
  );
}
