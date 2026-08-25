import { ChevronLeft } from 'lucide-react-native';
import { useLayoutEffect } from 'react';
import { useLocalSearchParams, useRouter, useNavigation, type Href } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { useAppTheme } from '@/lib/theme';

type StackBackButtonProps = {
  fallbackHref: Href;
  /** When set, back always returns here (cross-module deep links). */
  returnHref?: Href;
};

function parseReturnHref(returnTo: string | string[] | undefined): Href | undefined {
  if (returnTo == null) {
    return undefined;
  }
  const value = typeof returnTo === 'string' ? returnTo : returnTo[0];
  return value ? (value as Href) : undefined;
}

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
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const returnHref = parseReturnHref(params[paramName]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => <StackBackButton fallbackHref={fallbackHref} returnHref={returnHref} />,
    });
  }, [navigation, fallbackHref, returnHref]);
}

export function StackBackButton({ fallbackHref, returnHref }: StackBackButtonProps) {
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
        if (returnHref) {
          router.replace(returnHref);
          return;
        }
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(fallbackHref);
        }
      }}
    />
  );
}
