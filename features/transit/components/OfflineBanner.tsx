import { WifiOff } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/ui/Banner';
import { hasOfflineCache } from '@/lib/offline-bundle';

export function OfflineBanner() {
  const { t } = useTranslation();
  const [hasCache, setHasCache] = useState(false);

  useEffect(() => {
    void hasOfflineCache().then(setHasCache);
  }, []);

  const message = hasCache ? t('offlineBannerCached') : t('offlineBanner');
  return <Banner variant="offline" icon={WifiOff} message={message} />;
}
