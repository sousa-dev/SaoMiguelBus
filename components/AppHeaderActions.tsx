import { type Href, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MoreHorizontal } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PremiumHeaderButton } from '@/components/PremiumHeaderButton';
import { ProfileHeaderButton } from '@/components/ProfileHeaderButton';
import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { SidebarHeaderButton } from '@/components/SidebarHeaderButton';
import { IconButton } from '@/components/ui/IconButton';
import { useAdFreeWindow } from '@/features/ads/hooks/useAdFreeWindow';
import { useRewardedAdFree } from '@/features/ads/hooks/useRewardedAdFree';
import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { usePremium } from '@/lib/premium-store';
import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

function formatRemainingMinutes(remainingMs: number): number {
  return Math.max(1, Math.ceil(remainingMs / 60_000));
}

/** Module root header actions — profile, settings, premium/remove-ads. Collapses to overflow before iOS nav-bar "…". */
export function AppHeaderActions() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const headerRightMaxWidth = Math.min(windowWidth * 0.62, 248);

  const isPremium = usePremium();
  const { openPaywall } = usePaywall();
  const { isAdFreeActive, remainingMs } = useAdFreeWindow();
  const { openModal, openStatusModal, isRewardOfferAvailable } = useRewardedAdFree('header');

  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [useOverflowMenu, setUseOverflowMenu] = useState(false);

  useEffect(() => {
    setUseOverflowMenu(false);
    setContentWidth(0);
  }, [windowWidth, isPremium, isAdFreeActive, isRewardOfferAvailable, remainingMs, t]);

  useEffect(() => {
    if (containerWidth == null || contentWidth === 0) {
      return;
    }
    setUseOverflowMenu(contentWidth > containerWidth);
  }, [containerWidth, contentWidth]);

  const openOverflowMenu = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }

    const premiumAction = (() => {
      if (isPremium) {
        return {
          text: t('premiumHeaderButtonActive'),
          onPress: () => router.push('/settings'),
        };
      }
      if (isAdFreeActive) {
        const label = t('adsAdFreeStatusRemaining', {
          minutes: formatRemainingMinutes(remainingMs),
        });
        return { text: label, onPress: () => openStatusModal() };
      }
      if (isRewardOfferAvailable) {
        return { text: t('removeAdsButton'), onPress: () => openModal() };
      }
      return {
        text: t('premiumGoPremium'),
        onPress: () => {
          void openPaywall('header');
        },
      };
    })();

    Alert.alert('', undefined, [
      {
        text: t('transitProfileTitle'),
        onPress: () => router.push('/profile' as Href),
      },
      {
        text: t('settingsTitle'),
        onPress: () => router.push('/settings'),
      },
      premiumAction,
      { text: t('cancel'), style: 'cancel' },
    ]);
  }, [
    isAdFreeActive,
    isPremium,
    isRewardOfferAvailable,
    openModal,
    openPaywall,
    openStatusModal,
    remainingMs,
    router,
    t,
  ]);

  if (useOverflowMenu) {
    return (
      <IconButton
        icon={MoreHorizontal}
        variant="ghost"
        color={theme.onSurface}
        accessibilityLabel={t('transitHeaderMoreOptions', { defaultValue: 'More options' })}
        onPress={openOverflowMenu}
      />
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        maxWidth: headerRightMaxWidth,
      }}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}
        onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}
      >
        <ProfileHeaderButton compact />
        <SettingsHeaderButton compact />
        <PremiumHeaderButton />
      </View>
    </View>
  );
}

/** Shared header chrome for module root (index) screens. */
export function useModuleRootHeaderOptions() {
  const { width: windowWidth } = useWindowDimensions();
  const headerRightMaxWidth = Math.min(windowWidth * 0.62, 248);

  return useMemo(
    () => ({
      headerLeft: () => <SidebarHeaderButton />,
      headerRight: () => <AppHeaderActions />,
      headerRightContainerStyle: { paddingRight: space.xs, maxWidth: headerRightMaxWidth },
    }),
    [headerRightMaxWidth],
  );
}
