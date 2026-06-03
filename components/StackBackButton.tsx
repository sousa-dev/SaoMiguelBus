import { ChevronLeft } from 'lucide-react-native';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { useAppTheme } from '@/lib/theme';

type StackBackButtonProps = {
  fallbackHref: Href;
};

/** Use in Stack.Screen options — hides the native back control so only StackBackButton shows. */
export function stackBackScreenOptions(fallbackHref: Href) {
  return {
    headerBackVisible: false as const,
    headerLeft: () => <StackBackButton fallbackHref={fallbackHref} />,
  };
}

export function StackBackButton({ fallbackHref }: StackBackButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useAppTheme();

  return (
    <IconButton
      icon={ChevronLeft}
      variant="ghost"
      color={theme.onSurface}
      accessibilityLabel={t('settingsBack')}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(fallbackHref);
        }
      }}
    />
  );
}
