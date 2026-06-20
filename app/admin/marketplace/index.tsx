import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateView';
import {
  useMarketplaceAdminCategories,
  useMarketplaceAdminProviders,
  useMarketplaceAdminQueue,
  useMarketplaceAdminReviews,
  useModerateMarketplaceProviderAdmin,
  useModerateMarketplaceReviewAdmin,
} from '@/features/marketplace/hooks/useMarketplaceAdminQueries';
import { confirmAction } from '@/lib/confirm';
import { useAppTheme } from '@/lib/theme';
import { space, typography } from '@/lib/tokens';
import type { MarketplaceAdminReview, MarketplaceProvider, ServiceCategory } from '@/lib/types';

type AdminTab = 'providers' | 'reviews' | 'categories';

export default function MarketplaceAdminScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>('providers');

  const queue = useMarketplaceAdminQueue();
  const providers = useMarketplaceAdminProviders(tab === 'providers');
  const reviews = useMarketplaceAdminReviews(tab === 'reviews');
  const categories = useMarketplaceAdminCategories(tab === 'categories');
  const moderateProvider = useModerateMarketplaceProviderAdmin();
  const moderateReview = useModerateMarketplaceReviewAdmin();

  const moderationStatusLabel = (status: string) =>
    t(`marketplaceAdminStatus_${status}`, { defaultValue: status });

  const refreshing =
    queue.isRefetching || providers.isRefetching || reviews.isRefetching || categories.isRefetching;

  const refetchAll = () => {
    void queue.refetch();
    void providers.refetch();
    void reviews.refetch();
    void categories.refetch();
  };

  const confirmModerate = async (
    titleKey: string,
    messageKey: string,
    onConfirm: () => void,
  ) => {
    const confirmed = await confirmAction({
      title: t(titleKey),
      message: t(messageKey),
      confirmLabel: t('marketplaceAdminConfirm'),
      cancelLabel: t('cancel'),
    });
    if (confirmed) {
      onConfirm();
    }
  };

  const renderProvider = ({ item }: { item: MarketplaceProvider }) => (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[typography.bodyStrong, { color: theme.text, flex: 1 }]}>{item.name}</Text>
        <Badge tone="accent" label={moderationStatusLabel(item.status ?? 'pending')} />
      </View>
      <Text style={[typography.caption, { color: theme.muted }]}>{item.category.name}</Text>
      <View style={styles.actions}>
        <Button
          label={t('marketplaceAdminAccept')}
          size="sm"
          onPress={() =>
            confirmModerate(
              'marketplaceAdminAcceptTitle',
              'marketplaceAdminAcceptProviderMessage',
              () => moderateProvider.mutate({ providerId: item.id, action: 'publish' }),
            )
          }
        />
        <Button
          label={t('marketplaceAdminReject')}
          size="sm"
          variant="outline"
          onPress={() =>
            confirmModerate(
              'marketplaceAdminRejectTitle',
              'marketplaceAdminRejectProviderMessage',
              () => moderateProvider.mutate({ providerId: item.id, action: 'reject' }),
            )
          }
        />
        <Button
          label={t('marketplaceAdminEdit')}
          size="sm"
          variant="ghost"
          onPress={() => router.push(`/admin/marketplace/provider/${item.id}`)}
        />
      </View>
    </View>
  );

  const renderReview = ({ item }: { item: MarketplaceAdminReview }) => (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[typography.bodyStrong, { color: theme.text, flex: 1 }]}>
          {item.providerName}
        </Text>
        <Badge tone="accent" label={moderationStatusLabel(item.status)} />
      </View>
      <Text style={[typography.body, { color: theme.text }]}>
        {'★'.repeat(item.rating)} {item.text || t('marketplaceAdminNoReviewText')}
      </Text>
      <View style={styles.actions}>
        <Button
          label={t('marketplaceAdminAccept')}
          size="sm"
          onPress={() =>
            confirmModerate(
              'marketplaceAdminAcceptTitle',
              'marketplaceAdminAcceptReviewMessage',
              () => moderateReview.mutate({ reviewId: item.id, action: 'publish' }),
            )
          }
        />
        <Button
          label={t('marketplaceAdminReject')}
          size="sm"
          variant="outline"
          onPress={() =>
            confirmModerate(
              'marketplaceAdminRejectTitle',
              'marketplaceAdminRejectReviewMessage',
              () => moderateReview.mutate({ reviewId: item.id, action: 'reject' }),
            )
          }
        />
        <Button
          label={t('marketplaceAdminEdit')}
          size="sm"
          variant="ghost"
          onPress={() => router.push(`/admin/marketplace/review/${item.id}`)}
        />
      </View>
    </View>
  );

  const renderCategory = ({ item }: { item: ServiceCategory }) => (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[typography.bodyStrong, { color: theme.text, flex: 1 }]}>
          {item.icon ? `${item.icon} ` : ''}
          {item.name}
        </Text>
        <Badge tone="accent" label={t('marketplaceAdminSuggested')} />
      </View>
      <Text style={[typography.caption, { color: theme.muted }]}>{item.slug}</Text>
      <View style={styles.actions}>
        <Button
          label={t('marketplaceAdminEdit')}
          size="sm"
          onPress={() => router.push(`/admin/marketplace/category/${item.id}`)}
        />
      </View>
    </View>
  );

  const activeQuery =
    tab === 'providers' ? providers : tab === 'reviews' ? reviews : categories;

  if (queue.isLoading && !queue.data) {
    return <LoadingState title={t('marketplaceAdminLoading')} />;
  }

  if (queue.isError) {
    return (
      <ErrorState
        title={t('marketplaceAdminLoadError')}
        actionLabel={t('retry')}
        onAction={() => void queue.refetch()}
      />
    );
  }

  const counts = queue.data;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.summary, { backgroundColor: theme.surfaceVariant }]}>
        <Text style={[typography.caption, { color: theme.muted }]}>
          {t('marketplaceAdminSummary', {
            providers: counts?.pendingProviders ?? 0,
            reviews: counts?.pendingReviews ?? 0,
            categories: counts?.suggestedCategories ?? 0,
          })}
        </Text>
      </View>

      <View style={styles.tabs}>
        <Chip
          label={`${t('marketplaceAdminTabProviders')} (${counts?.pendingProviders ?? 0})`}
          selected={tab === 'providers'}
          onPress={() => setTab('providers')}
        />
        <Chip
          label={`${t('marketplaceAdminTabReviews')} (${counts?.pendingReviews ?? 0})`}
          selected={tab === 'reviews'}
          onPress={() => setTab('reviews')}
        />
        <Chip
          label={`${t('marketplaceAdminTabCategories')} (${counts?.suggestedCategories ?? 0})`}
          selected={tab === 'categories'}
          onPress={() => setTab('categories')}
        />
      </View>

      {activeQuery.isLoading ? (
        <LoadingState title={t('marketplaceAdminLoading')} />
      ) : activeQuery.isError ? (
        <ErrorState
          title={t('marketplaceAdminLoadError')}
          actionLabel={t('retry')}
          onAction={() => void activeQuery.refetch()}
        />
      ) : tab === 'providers' ? (
        <FlatList
          data={providers.data?.providers ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProvider}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetchAll} />}
          ListEmptyComponent={<EmptyState title={t('marketplaceAdminEmptyProviders')} />}
        />
      ) : tab === 'reviews' ? (
        <FlatList
          data={reviews.data?.reviews ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderReview}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetchAll} />}
          ListEmptyComponent={<EmptyState title={t('marketplaceAdminEmptyReviews')} />}
        />
      ) : (
        <FlatList
          data={categories.data ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCategory}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetchAll} />}
          ListFooterComponent={
            <Text style={[typography.caption, styles.footerNote, { color: theme.muted }]}>
              {t('marketplaceAdminCategoryDeleteNote')}
            </Text>
          }
          ListEmptyComponent={<EmptyState title={t('marketplaceAdminEmptyCategories')} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summary: { padding: space.md, margin: space.lg, borderRadius: 12 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg, marginBottom: space.md },
  list: { padding: space.lg, paddingTop: 0, gap: space.md, flexGrow: 1 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: space.md, marginBottom: space.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  footerNote: { textAlign: 'center', marginTop: space.lg, paddingHorizontal: space.lg },
});
