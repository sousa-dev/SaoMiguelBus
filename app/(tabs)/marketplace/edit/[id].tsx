import { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { ProviderForm } from '@/features/marketplace/components/ProviderForm';
import { useProvider, useUpdateProvider, useDeleteProvider } from '@/features/marketplace/hooks/useMarketplaceQueries';
import { useNetworkStatus } from '@/lib/network-status';
import { useAppStackScreenOptions } from '@/lib/navigation';
import { ErrorState, LoadingState } from '@/components/ui/StateView';
import type { ProviderWriteInput } from '@/lib/types';

export default function EditListingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const screenOptions = useAppStackScreenOptions();
  const { isOnline } = useNetworkStatus();
  const params = useLocalSearchParams<{ id: string }>();
  const providerId = Number(params.id);

  const provider = useProvider(providerId);
  const update = useUpdateProvider(providerId);
  const deleteProvider = useDeleteProvider();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (input: ProviderWriteInput) => {
    if (!isOnline) {
      setError(t('offlineBanner'));
      return;
    }
    setError(null);
    try {
      await update.mutateAsync(input);
      router.back();
    } catch {
      setError(t('marketplaceFormError'));
    }
  };

  const onDelete = async () => {
    if (!isOnline) {
      setError(t('offlineBanner'));
      return;
    }
    try {
      await deleteProvider.mutateAsync(providerId);
      router.back();
    } catch {
      setError(t('marketplaceLoadError'));
    }
  };

  if (provider.isLoading) {
    return (
      <Screen withStackHeader>
        <LoadingState />
      </Screen>
    );
  }

  if (provider.isError || !provider.data) {
    return (
      <Screen withStackHeader>
        <ErrorState title={t('marketplaceLoadError')} />
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ ...screenOptions, headerShown: true, title: t('marketplaceEditAction') }} />
      <Screen>
        <ProviderForm
          initial={provider.data}
          submitting={update.isPending}
          deleting={deleteProvider.isPending}
          error={error}
          onSubmit={(input) => void onSubmit(input)}
          onDelete={() => void onDelete()}
        />
      </Screen>
    </>
  );
}
