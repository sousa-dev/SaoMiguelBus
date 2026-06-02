import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ProviderForm } from '@/features/marketplace/components/ProviderForm';
import { useCreateProvider } from '@/features/marketplace/hooks/useMarketplaceQueries';
import type { ProviderWriteInput } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

export default function NewListingScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const create = useCreateProvider();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (input: ProviderWriteInput) => {
    setError(null);
    try {
      await create.mutateAsync(input);
      router.back();
    } catch {
      setError(t('marketplaceFormError'));
    }
  };

  return (
    <ProviderForm
      theme={theme}
      submitting={create.isPending}
      error={error}
      onSubmit={(input) => void onSubmit(input)}
    />
  );
}
