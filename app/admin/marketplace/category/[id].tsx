import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/StateView';
import { Field } from '@/components/ui/Field';
import {
  useMarketplaceAdminCategories,
  useUpdateMarketplaceCategoryAdmin,
} from '@/features/marketplace/hooks/useMarketplaceAdminQueries';
import { notify } from '@/lib/confirm';
import { useAppTheme } from '@/lib/theme';
import { space, typography } from '@/lib/tokens';

export default function AdminCategoryEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Number(id);
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const categories = useMarketplaceAdminCategories();
  const update = useUpdateMarketplaceCategoryAdmin(categoryId);
  const category = categories.data?.find((c) => c.id === categoryId);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('');

  useEffect(() => {
    if (!category) {
      return;
    }
    setName(category.name);
    setSlug(category.slug);
    setIcon(category.icon);
  }, [category]);

  if (categories.isLoading) {
    return <LoadingState title={t('marketplaceAdminLoading')} />;
  }

  if (!category) {
    return (
      <ErrorState
        title={t('marketplaceAdminCategoryNotFound')}
        actionLabel={t('retry')}
        onAction={() => void categories.refetch()}
      />
    );
  }

  const save = (approve: boolean) => {
    setError(null);
    update.mutate(
      {
        name: name.trim(),
        slug: slug.trim(),
        icon: icon.trim(),
        approve,
      },
      {
        onSuccess: () => {
          notify(
            t('marketplaceAdminSavedTitle'),
            approve ? t('marketplaceAdminCategoryApproved') : t('marketplaceAdminSavedMessage'),
          );
          router.back();
        },
        onError: () => setError(t('marketplaceAdminSaveError')),
      },
    );
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {error ? <Banner variant="danger" message={error} /> : null}
      <Card elevated>
        <Field label={t('marketplaceAdminCategoryName')} value={name} onChangeText={setName} />
        <Field label={t('marketplaceAdminCategorySlug')} value={slug} onChangeText={setSlug} />
        <Field label={t('marketplaceAdminCategoryIcon')} value={icon} onChangeText={setIcon} />
        <Text style={[typography.caption, { color: theme.muted, marginTop: space.sm }]}>
          {t('marketplaceAdminCategoryDeleteNote')}
        </Text>
      </Card>
      <Button label={t('marketplaceAdminSave')} onPress={() => save(false)} loading={update.isPending} fullWidth />
      <Button
        label={t('marketplaceAdminApproveCategory')}
        onPress={() => save(true)}
        loading={update.isPending}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.md, paddingBottom: space['4xl'] },
});
