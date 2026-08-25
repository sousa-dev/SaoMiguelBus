import { Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { shareJourney } from '@/features/transit/share-trip';
import { useAppTheme } from '@/lib/theme';
import type { TransitJourney } from '@/lib/types';

type Props = {
  journey: TransitJourney;
};

/** Card-level sibling of `ShareTripButton`: shares every bus, not one leg. */
export function ShareJourneyButton({ journey }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <IconButton
      icon={Share2}
      variant="ghost"
      color={theme.muted}
      accessibilityLabel={t('transitShareTrip')}
      onPress={() => void shareJourney(journey, { t, alertTitle: t('transitShareTitle') })}
    />
  );
}
