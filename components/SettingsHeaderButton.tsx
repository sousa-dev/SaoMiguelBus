import { Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { useAppTheme } from '@/lib/theme';

export function SettingsHeaderButton() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useAppTheme();

  return (
    <IconButton
      icon={Settings}
      variant="ghost"
      color={theme.onSurface}
      accessibilityLabel={t('settingsTitle')}
      onPress={() => router.push('/settings')}
    />
  );
}
