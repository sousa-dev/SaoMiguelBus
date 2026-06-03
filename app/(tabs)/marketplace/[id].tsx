import { useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { MessageCircle, Navigation, PenLine, Pencil, Phone, Star } from 'lucide-react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { OsmMapLayer } from '@/components/OsmMapLayer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateView';
import { ContactRow } from '@/features/marketplace/components/ContactRow';
import { ReviewSheet } from '@/features/marketplace/components/ReviewSheet';
import {
  useDeleteProvider,
  useProvider,
  useProviderReviews,
} from '@/features/marketplace/hooks/useMarketplaceQueries';
import { coordinateToRegion } from '@/lib/island-map';
import { useNetworkStatus } from '@/lib/network-status';
import { iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import { useFabActions } from '@/lib/fab-store';
import { useMarketplaceStore } from '@/lib/marketplace-store';
import { track } from '@/lib/analytics';
import { composeMarketplaceEditSuggestion } from '@/lib/feedback-mail';
import i18n from '@/lib/i18n';
import { getAnalyticsPlatform, getAppVersion } from '@/lib/platform';

function contactDigits(value: string): string {
  return value.replace(/[^\d+]/g, '');
}

export default function ProviderDetailScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const params = useLocalSearchParams<{ id: string }>();
  const providerId = Number(params.id);

  const provider = useProvider(providerId);
  const reviews = useProviderReviews(providerId);
  const deleteProvider = useDeleteProvider();
  const isMine = useMarketplaceStore((s) => s.isMine(providerId));

  const [reviewVisible, setReviewVisible] = useState(false);
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);

  const fabActions = useMemo(() => {
    const p = provider.data;
    if (!p) {
      return [];
    }
    const actions = [];
    const open = (action: 'call' | 'whatsapp' | 'directions', url: string) => {
      track('marketplace', 'engage', { action, provider_id: p.id });
      void Linking.openURL(url);
    };
    if (p.phone) {
      actions.push({
        key: 'call',
        labelKey: 'fabCall',
        icon: Phone,
        onPress: () => open('call', `tel:${contactDigits(p.phone!)}`),
      });
    }
    if (p.whatsapp) {
      actions.push({
        key: 'whatsapp',
        labelKey: 'fabWhatsApp',
        icon: MessageCircle,
        onPress: () =>
          open('whatsapp', `https://wa.me/${contactDigits(p.whatsapp!).replace('+', '')}`),
      });
    }
    if (p.latitude != null && p.longitude != null) {
      actions.push({
        key: 'directions',
        labelKey: 'fabDirections',
        icon: Navigation,
        onPress: () =>
          open('directions', `https://www.google.com/maps?q=${p.latitude},${p.longitude}`),
      });
    }
    actions.push({
      key: 'write-review',
      labelKey: 'fabWriteReview',
      icon: Star,
      onPress: () => setReviewVisible(true),
    });
    if (!isMine) {
      actions.push({
        key: 'suggest-edit',
        labelKey: 'fabSuggestEdit',
        icon: PenLine,
        onPress: () => {
          track('marketplace', 'engage', { action: 'suggest_edit', provider_id: p.id });
          void composeMarketplaceEditSuggestion({
            provider: { id: p.id, name: p.name, category: p.category.name },
            subject: t('marketplaceSuggestEditSubject', { name: p.name }),
            description: t('marketplaceSuggestEditBody', {
              name: p.name,
              category: p.category.name,
              id: p.id,
            }),
            context: {
              from: `/(tabs)/marketplace/${p.id}`,
              label: p.name,
              appVersion: getAppVersion(),
              platform: getAnalyticsPlatform(),
              locale: i18n.language,
            },
          });
        },
      });
    }
    if (isMine) {
      actions.push({
        key: 'edit-listing',
        labelKey: 'fabEditListing',
        icon: Pencil,
        href: {
          pathname: '/(tabs)/marketplace/edit/[id]',
          params: { id: String(providerId) },
        } as Href,
      });
    }
    return actions;
  }, [provider.data, isMine, providerId, t]);

  useFabActions(fabActions);

  const runDelete = async () => {
    setDeleteSheetOpen(false);
    await deleteProvider.mutateAsync(providerId);
    router.back();
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

  const p = provider.data;
  const initial = p.name.trim().charAt(0).toUpperCase() || '?';
  const hasMap = p.latitude != null && p.longitude != null;

  return (
    <Screen withStackHeader>
      <ScrollView contentContainerStyle={styles.content}>
        {!isOnline ? (
          <Card style={{ marginBottom: space.md }}>
            <Text style={[typography.caption, { color: theme.muted }]}>{t('offlineBanner')}</Text>
          </Card>
        ) : null}

        <Card elevated>
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={[typography.headline, { color: theme.onPrimary }]}>{initial}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={[typography.title, { color: theme.text }]}>{p.name}</Text>
              <Badge label={p.category.name} tone="neutral" />
              {p.isPromoted ? <Badge label={t('marketplacePromoted')} tone="accent" /> : null}
              {p.status && p.status !== 'published' ? (
                <Badge label={t('marketplacePendingBadge')} tone="primary" />
              ) : null}
            </View>
          </View>

          <View style={styles.ratingRow}>
            {p.reviewCount > 0 ? (
              <>
                <Star size={iconSize.md} color={theme.accent} fill={theme.accent} />
                <Text style={[typography.body, { color: theme.muted }]}>
                  {p.rating.toFixed(1)} · {t('marketplaceReviewCount', { count: p.reviewCount })}
                </Text>
              </>
            ) : (
              <Text style={[typography.body, { color: theme.muted }]}>{t('marketplaceNoReviews')}</Text>
            )}
          </View>

          {p.bio ? (
            <Text style={[typography.body, { color: theme.text, marginTop: space.md, lineHeight: 22 }]}>
              {p.bio}
            </Text>
          ) : null}
          {p.hourlyRate != null ? (
            <Text style={[typography.bodyStrong, { color: theme.text, marginTop: space.sm }]}>
              {t('marketplaceRateLabel', { rate: p.hourlyRate })}
            </Text>
          ) : null}
        </Card>

        <ContactRow provider={p} />

        {hasMap && Platform.OS !== 'web' ? (
          <Card elevated style={styles.mapCard}>
            <MapView
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              mapType="none"
              scrollEnabled={false}
              initialRegion={coordinateToRegion({ lat: p.latitude!, lng: p.longitude! })}
            >
              <OsmMapLayer isDark={theme.isDark} />
              <Marker coordinate={{ latitude: p.latitude!, longitude: p.longitude! }} />
            </MapView>
            <Button
              label={t('marketplaceContactDirections')}
              variant="outline"
              fullWidth
              onPress={() =>
                Linking.openURL(`https://www.google.com/maps?q=${p.latitude},${p.longitude}`)
              }
              style={{ marginTop: space.md }}
            />
          </Card>
        ) : null}

        {isMine ? (
          <View style={styles.ownerRow}>
            <Button
              label={t('marketplaceEditAction')}
              variant="outline"
              onPress={() =>
                router.push({ pathname: '/(tabs)/marketplace/edit/[id]', params: { id: String(providerId) } })
              }
              style={{ flex: 1 }}
            />
            <Button
              label={t('marketplaceDeleteAction')}
              variant="danger"
              onPress={() => setDeleteSheetOpen(true)}
              style={{ flex: 1 }}
            />
          </View>
        ) : null}

        <View style={styles.reviewsHeader}>
          <Text style={[typography.headline, { color: theme.text }]}>{t('marketplaceReviews')}</Text>
          <Button label={t('marketplaceWriteReview')} variant="ghost" onPress={() => setReviewVisible(true)} />
        </View>

        {(reviews.data ?? []).length === 0 ? (
          <EmptyState title={t('marketplaceReviewsEmpty')} description={t('marketplaceNoReviews')} />
        ) : (
          (reviews.data ?? []).map((r) => (
            <Card key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewStars}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={14}
                    color={i < r.rating ? theme.accent : theme.muted}
                    fill={i < r.rating ? theme.accent : 'transparent'}
                  />
                ))}
              </View>
              {r.text ? (
                <Text style={[typography.body, { color: theme.text, marginTop: space.sm }]}>{r.text}</Text>
              ) : null}
            </Card>
          ))
        )}

        <ReviewSheet visible={reviewVisible} providerId={providerId} onClose={() => setReviewVisible(false)} />

        <Sheet visible={deleteSheetOpen} onClose={() => setDeleteSheetOpen(false)} title={t('marketplaceDeleteAction')}>
          <Text style={[typography.body, { color: theme.text, paddingHorizontal: space.lg }]}>
            {t('marketplaceDeleteConfirm')}
          </Text>
          <View style={{ padding: space.lg, gap: space.sm }}>
            <Button
              label={t('marketplaceDeleteAction')}
              variant="danger"
              loading={deleteProvider.isPending}
              onPress={() => void runDelete()}
              fullWidth
            />
            <Button label={t('marketplaceReviewCancel')} variant="ghost" onPress={() => setDeleteSheetOpen(false)} fullWidth />
          </View>
        </Sheet>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space['4xl'] },
  header: { flexDirection: 'row', gap: space.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: space.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  mapCard: { marginTop: space.md, overflow: 'hidden' },
  map: { height: 160, borderRadius: 12 },
  ownerRow: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl,
    marginBottom: space.md,
  },
  reviewCard: { marginBottom: space.sm },
  reviewStars: { flexDirection: 'row', gap: 2 },
});
