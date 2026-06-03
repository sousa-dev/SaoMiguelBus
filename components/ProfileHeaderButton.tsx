import { User } from 'lucide-react-native';
import { type Href, useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { useAppTheme } from '@/lib/theme';

export function ProfileHeaderButton() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useAppTheme();

  return (
    <IconButton
      icon={User}
      variant="ghost"
      color={theme.onSurface}
      accessibilityLabel={t('transitProfileTitle')}
      onPress={() => router.push('/profile' as Href)}
    />
  );
}
