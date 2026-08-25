import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ErrorState, LoadingState } from '@/components/ui/StateView';
import { ProviderForm } from '@/features/marketplace/components/ProviderForm';
import {
  useUpdateMarketplaceProviderAdmin,
} from '@/features/marketplace/hooks/useMarketplaceAdminQueries';
import { useProvider } from '@/features/marketplace/hooks/useMarketplaceQueries';
import { notify } from '@/lib/confirm';
import type { ProviderAdminWriteInput } from '@/lib/types';

export default function AdminProviderEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const providerId = Number(id);
  const router = useRouter();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const providerQuery = useProvider(providerId);
  const update = useUpdateMarketplaceProviderAdmin(providerId);
  const provider = providerQuery.data;

  if (providerQuery.isLoading) {
    return <LoadingState title={t('marketplaceAdminLoading')} />;
  }

  if (!provider) {
    return (
      <ErrorState
        title={t('marketplaceAdminProviderNotFound')}
        actionLabel={t('commonRetry')}
        onAction={() => void providerQuery.refetch()}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <ProviderForm
        mode="admin"
        initial={provider}
        submitting={update.isPending}
        error={error}
        onSubmit={() => undefined}
        onAdminSubmit={(input: ProviderAdminWriteInput) => {
          setError(null);
          update.mutate(input, {
            onSuccess: () => {
              notify(t('marketplaceAdminSavedTitle'), t('marketplaceAdminSavedMessage'));
              router.back();
            },
            onError: () => setError(t('marketplaceAdminSaveError')),
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
