import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { MarketplaceProvider } from '@/lib/types';
import type { AppTheme } from '@/lib/theme';

export function ProviderCard({
  provider,
  theme,
  onPress,
}: {
  provider: MarketplaceProvider;
  theme: AppTheme;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {provider.name}
        </Text>
        {provider.isPromoted ? (
          <View style={[styles.badge, { backgroundColor: theme.accent }]}>
            <Text style={[styles.badgeText, { color: theme.text }]}>{t('marketplacePromoted')}</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ color: theme.muted, fontSize: 13, marginTop: 2 }}>
        {provider.category.name}
      </Text>
      {provider.bio ? (
        <Text style={{ color: theme.text, fontSize: 13, marginTop: 6 }} numberOfLines={2}>
          {provider.bio}
        </Text>
      ) : null}
      <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8 }}>
        {provider.reviewCount > 0
          ? `★ ${provider.rating.toFixed(1)} · ${t('marketplaceReviewCount', { count: provider.reviewCount })}`
          : t('marketplaceNoReviews')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
