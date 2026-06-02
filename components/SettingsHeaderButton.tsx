import { Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';

export function SettingsHeaderButton() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <IconButton
      icon={Settings}
      variant="ghost"
      color={undefined}
      accessibilityLabel={t('settingsTitle')}
      onPress={() => router.push('/settings')}
    />
  );
}
