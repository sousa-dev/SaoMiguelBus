import { Plus } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Fab } from '@/components/ui/Fab';

export function QuickReportButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const { t } = useTranslation();
  return <Fab icon={Plus} onPress={onPress} accessibilityLabel={t('trafficReportTitle')} disabled={disabled} />;
}
