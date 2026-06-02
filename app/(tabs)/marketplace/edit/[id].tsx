import React, { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ProviderForm } from '@/features/marketplace/components/ProviderForm';
import { useProvider, useUpdateProvider } from '@/features/marketplace/hooks/useMarketplaceQueries';
import type { ProviderWriteInput } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

export default function EditListingScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const providerId = Number(params.id);

  const provider = useProvider(providerId);
  const update = useUpdateProvider(providerId);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (input: ProviderWriteInput) => {
    setError(null);
    try {
      await update.mutateAsync(input);
      router.back();
    } catch {
      setError(t('marketplaceFormError'));
    }
  };

  if (provider.isLoading || !provider.data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        {provider.isError ? (
          <Text style={{ color: theme.muted }}>{t('marketplaceLoadError')}</Text>
        ) : (
          <ActivityIndicator color={theme.primary} />
        )}
      </View>
    );
  }

  return (
    <ProviderForm
      theme={theme}
      initial={provider.data}
      submitting={update.isPending}
      error={error}
      onSubmit={(input) => void onSubmit(input)}
    />
  );
}
