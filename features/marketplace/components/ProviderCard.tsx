import { Mail, MapPin, Phone, Star } from 'lucide-react-native';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { MarketplaceProvider } from '@/lib/types';

export function ProviderCard({
  provider,
  onPress,
}: {
  provider: MarketplaceProvider;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const initial = provider.name.trim().charAt(0).toUpperCase() || '?';

  const call = () => {
    if (provider.phone) {
      void Linking.openURL(`tel:${provider.phone}`);
    }
  };
  const email = () => {
    if (provider.email) {
      void Linking.openURL(`mailto:${provider.email}`);
    }
  };

  return (
    <Card onPress={onPress} elevated style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <Text style={[typography.headline, { color: theme.onPrimary }]}>{initial}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={[typography.headline, { color: theme.text }]} numberOfLines={1}>
            {provider.name}
          </Text>
          <Badge label={provider.category.name} tone="neutral" />
        </View>
        {provider.isPromoted ? <Badge label={t('marketplacePromoted')} tone="accent" /> : null}
      </View>

      {provider.bio ? (
        <Text style={[typography.body, { color: theme.text, marginTop: space.sm }]} numberOfLines={2}>
          {provider.bio}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.rating}>
          {provider.reviewCount > 0 ? (
            <>
              <Star size={iconSize.sm} color={theme.accent} fill={theme.accent} />
              <Text style={[typography.caption, { color: theme.muted }]}>
                {provider.rating.toFixed(1)} · {t('marketplaceReviewCount', { count: provider.reviewCount })}
              </Text>
            </>
          ) : (
            <Text style={[typography.caption, { color: theme.muted }]}>{t('marketplaceNoReviews')}</Text>
          )}
        </View>
        <View style={styles.actions}>
          {provider.phone ? (
            <IconButton icon={Phone} accessibilityLabel={provider.name} onPress={call} color={theme.primary} />
          ) : null}
          {provider.email ? (
            <IconButton icon={Mail} accessibilityLabel={provider.name} onPress={email} color={theme.primary} />
          ) : null}
          {provider.latitude != null && provider.longitude != null ? (
            <IconButton icon={MapPin} accessibilityLabel={provider.name} onPress={onPress} color={theme.primary} />
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: space.xs },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.md },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  actions: { flexDirection: 'row' },
});
