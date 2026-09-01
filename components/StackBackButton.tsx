import { ChevronLeft } from 'lucide-react-native';
import { useLayoutEffect } from 'react';
import { useNavigation, type Href } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { useAppBack, useAppBackGuard, useReturnHref } from '@/lib/app-back';
import { useAppTheme } from '@/lib/theme';

type StackBackButtonProps = {
  fallbackHref: Href;
  /**
   * When set, back always returns here (cross-module deep links). Omit to pick the
   * `returnTo` route param up automatically.
   */
  returnHref?: Href;
};

/** Use in Stack.Screen options — hides the native back control so only StackBackButton shows. */
export function stackBackScreenOptions(fallbackHref: Href, returnHref?: Href) {
  return {
    headerBackVisible: false as const,
    headerLeft: () => <StackBackButton fallbackHref={fallbackHref} returnHref={returnHref} />,
  };
}

/** Configure a stack screen header back button with optional `returnTo` route param. */
export function useStackBackHeader(fallbackHref: Href, paramName = 'returnTo') {
  const navigation = useNavigation();
  const returnHref = useReturnHref(paramName);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => <StackBackButton fallbackHref={fallbackHref} returnHref={returnHref} />,
    });
  }, [navigation, fallbackHref, returnHref]);
}

export function StackBackButton({ fallbackHref, returnHref }: StackBackButtonProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { goBack } = useAppBack();
  const paramReturnHref = useReturnHref();
  const target = returnHref ?? paramReturnHref;

  // The header renders inside the screen's navigation context, so guarding here covers
  // the native pop for exactly the screens that show this button.
  useAppBackGuard(fallbackHref, target);

  return (
    <IconButton
      icon={ChevronLeft}
      variant="ghost"
      color={theme.onSurface}
      accessibilityLabel={t('settingsBack')}
      onPress={() => goBack(fallbackHref, target)}
    />
  );
}
