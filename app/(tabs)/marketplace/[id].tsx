import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ContactRow } from '@/features/marketplace/components/ContactRow';
import { ReviewSheet } from '@/features/marketplace/components/ReviewSheet';
import {
  useDeleteProvider,
  useProvider,
  useProviderReviews,
} from '@/features/marketplace/hooks/useMarketplaceQueries';
import { useMarketplaceStore } from '@/lib/marketplace-store';
import { useAppTheme } from '@/lib/theme';

export default function ProviderDetailScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const providerId = Number(params.id);

  const provider = useProvider(providerId);
  const reviews = useProviderReviews(providerId);
  const deleteProvider = useDeleteProvider();
  const isMine = useMarketplaceStore((s) => s.isMine(providerId));

  const [reviewVisible, setReviewVisible] = useState(false);

  const confirmDelete = () => {
    Alert.alert(t('marketplaceDeleteAction'), t('marketplaceDeleteConfirm'), [
      { text: t('marketplaceReviewCancel'), style: 'cancel' },
      {
        text: t('marketplaceDeleteAction'),
        style: 'destructive',
        onPress: async () => {
          await deleteProvider.mutateAsync(providerId);
          router.back();
        },
      },
    ]);
  };

  if (provider.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (provider.isError || !provider.data) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.muted }}>{t('marketplaceLoadError')}</Text>
      </View>
    );
  }

  const p = provider.data;

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={[styles.name, { color: theme.text }]}>{p.name}</Text>
        {p.isPromoted ? (
          <View style={[styles.badge, { backgroundColor: theme.accent }]}>
            <Text style={[styles.badgeText, { color: theme.text }]}>{t('marketplacePromoted')}</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ color: theme.muted, marginTop: 2 }}>{p.category.name}</Text>
      {p.status && p.status !== 'published' ? (
        <View style={[styles.pending, { borderColor: theme.border }]}>
          <Text style={{ color: theme.muted, fontSize: 12 }}>{t('marketplacePendingBadge')}</Text>
        </View>
      ) : null}

      <Text style={{ color: theme.muted, marginTop: 10 }}>
        {p.reviewCount > 0
          ? `★ ${p.rating.toFixed(1)} · ${t('marketplaceReviewCount', { count: p.reviewCount })}`
          : t('marketplaceNoReviews')}
      </Text>

      {p.bio ? <Text style={{ color: theme.text, marginTop: 12, lineHeight: 20 }}>{p.bio}</Text> : null}
      {p.hourlyRate != null ? (
        <Text style={{ color: theme.text, marginTop: 8, fontWeight: '600' }}>
          {t('marketplaceRateLabel', { rate: p.hourlyRate })}
        </Text>
      ) : null}

      <ContactRow provider={p} />

      {isMine ? (
        <View style={styles.ownerRow}>
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(tabs)/marketplace/edit/[id]', params: { id: String(providerId) } })
            }
            style={[styles.ownerBtn, { borderColor: theme.border }]}
          >
            <Text style={{ color: theme.text, fontWeight: '600' }}>{t('marketplaceEditAction')}</Text>
          </Pressable>
          <Pressable onPress={confirmDelete} style={[styles.ownerBtn, { borderColor: theme.danger }]}>
            <Text style={{ color: theme.danger, fontWeight: '600' }}>{t('marketplaceDeleteAction')}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.reviewsHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('marketplaceReviews')}</Text>
        <Pressable onPress={() => setReviewVisible(true)}>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>{t('marketplaceWriteReview')}</Text>
        </Pressable>
      </View>

      {(reviews.data ?? []).length === 0 ? (
        <Text style={{ color: theme.muted, marginTop: 8 }}>{t('marketplaceNoReviews')}</Text>
      ) : (
        (reviews.data ?? []).map((r) => (
          <View key={r.id} style={[styles.review, { borderColor: theme.border }]}>
            <Text style={{ color: theme.accent }}>{'★'.repeat(r.rating)}</Text>
            {r.text ? <Text style={{ color: theme.text, marginTop: 4 }}>{r.text}</Text> : null}
          </View>
        ))
      )}

      <ReviewSheet
        visible={reviewVisible}
        providerId={providerId}
        onClose={() => setReviewVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 22, fontWeight: '800', flexShrink: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  pending: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 10, alignSelf: 'flex-start' },
  ownerRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  ownerBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, flexGrow: 1, alignItems: 'center' },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  review: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10 },
});
