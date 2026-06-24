import { useState } from 'react';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { ProviderForm } from '@/features/marketplace/components/ProviderForm';
import { useInAppReviewConfig } from '@/features/app-review/hooks/useInAppReviewConfig';
import { maybeRequestAppReview } from '@/features/app-review/lib/maybe-request-app-review';
import { useCreateProvider } from '@/features/marketplace/hooks/useMarketplaceQueries';
import { useNetworkStatus } from '@/lib/network-status';
import { useAppStackScreenOptions } from '@/lib/navigation';
import type { ProviderWriteInput } from '@/lib/types';

export default function NewListingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const screenOptions = useAppStackScreenOptions();
  const { isOnline } = useNetworkStatus();
  const create = useCreateProvider();
  const reviewConfig = useInAppReviewConfig();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (input: ProviderWriteInput) => {
    if (!isOnline) {
      setError(t('offlineBanner'));
      return;
    }
    setError(null);
    try {
      await create.mutateAsync(input);
      void maybeRequestAppReview({
        trigger: 'marketplace_listing_created',
        inAppReviewEnabled: reviewConfig.enabled,
        storeUrls: reviewConfig.storeUrls,
      });
      router.back();
    } catch {
      setError(t('marketplaceFormError'));
    }
  };

  return (
    <>
      <Stack.Screen options={{ ...screenOptions, headerShown: true }} />
      <Screen>
        <ProviderForm
          submitting={create.isPending}
          error={error}
          onSubmit={(input) => void onSubmit(input)}
        />
      </Screen>
    </>
  );
}
