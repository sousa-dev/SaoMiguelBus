import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { shouldShowAppUpdatePrompt } from '@/features/app-update/lib/should-show-update-prompt';
import { fetchAppUpdateCheck } from '@/lib/api';
import { setDismissedAppUpdateVersion } from '@/lib/app-update-dismiss';
import { useNetworkStatus } from '@/lib/network-status';
import { getAnalyticsPlatform, getAppVersion } from '@/lib/platform';
import type { AppUpdateMode } from '@/lib/types';

function isNativeStorePlatform(platform: string): platform is 'ios' | 'android' {
  return platform === 'ios' || platform === 'android';
}

export function useAppUpdateCheck() {
  const { isOnline } = useNetworkStatus();
  const platform = getAnalyticsPlatform();
  const version = getAppVersion();
  const nativePlatform = isNativeStorePlatform(platform);
  const queryClient = useQueryClient();
  const [dismissedVersion, setDismissedVersionState] = useState<string | null>(null);

  useEffect(() => {
    if (!nativePlatform || !isOnline) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ['app-update-check', platform, version] });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void queryClient.invalidateQueries({ queryKey: ['app-update-check', platform, version] });
      }
    });
    return () => sub.remove();
  }, [isOnline, nativePlatform, platform, queryClient, version]);

  const query = useQuery({
    queryKey: ['app-update-check', platform, version],
    queryFn: () => fetchAppUpdateCheck({ platform, version }),
    enabled: isOnline && nativePlatform,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    retry: 1,
  });

  const data = query.data;
  const shouldShow = data
    ? shouldShowAppUpdatePrompt({
        updateRequired: data.updateRequired,
        updateMode: data.updateMode,
        currentVersion: data.currentVersion,
        dismissedVersion,
      })
    : false;

  const dismiss = useCallback(() => {
    if (!data?.currentVersion) {
      return;
    }
    setDismissedVersionState(data.currentVersion);
    void setDismissedAppUpdateVersion(data.currentVersion);
  }, [data?.currentVersion]);

  const openStore = useCallback(async () => {
    if (!data?.storeUrl) {
      return;
    }
    const canOpen = await Linking.canOpenURL(data.storeUrl);
    if (canOpen) {
      await Linking.openURL(data.storeUrl);
    }
  }, [data?.storeUrl]);

  return {
    shouldShow,
    updateMode: (data?.updateMode ?? 'optional') as AppUpdateMode,
    storeUrl: data?.storeUrl ?? null,
    currentVersion: data?.currentVersion ?? null,
    dismiss,
    openStore,
  };
}
