import { WifiOff } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/ui/Banner';

export function OfflineBanner() {
  const { t } = useTranslation();
  return <Banner variant="offline" icon={WifiOff} message={t('offlineBanner')} />;
}
