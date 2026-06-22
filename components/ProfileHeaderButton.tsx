import { User } from 'lucide-react-native';
import { type Href, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export function ProfileHeaderButton({ compact = false }: { compact?: boolean }) {
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
      style={compact ? styles.compact : undefined}
    />
  );
}

const styles = StyleSheet.create({
  compact: {
    paddingHorizontal: space.xs,
  },
});
