import { Mail, MapPin, MessageCircle, Phone, Star } from 'lucide-react-native';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { distanceKm, formatDistanceKm } from '@/features/marketplace/distanceKm';
import { iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { MarketplaceProvider } from '@/lib/types';

export function ProviderCard({
  provider,
  onPress,
  viewerCoords,
}: {
  provider: MarketplaceProvider;
  onPress: () => void;
  viewerCoords?: { lat: number; lng: number } | null;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const call = () => {
    if (provider.phone) {
      void Linking.openURL(`tel:${provider.phone}`);
    }
  };
  const whatsapp = () => {
    if (provider.whatsapp) {
      void Linking.openURL(`https://wa.me/${provider.whatsapp.replace(/\D/g, '')}`);
    }
  };
  const email = () => {
    if (provider.email) {
      void Linking.openURL(`mailto:${provider.email}`);
    }
  };

  const distanceLabel =
    viewerCoords &&
    provider.latitude != null &&
    provider.longitude != null
      ? formatDistanceKm(
          distanceKm(viewerCoords.lat, viewerCoords.lng, provider.latitude, provider.longitude),
        )
      : null;

  return (
    <Card onPress={onPress} elevated style={styles.card}>
      <View style={styles.header}>
        <Text style={[typography.headline, styles.title, { color: theme.text }]} numberOfLines={2}>
          {provider.name}
        </Text>
        <View style={styles.badges}>
          <Badge label={provider.category.name} tone="neutral" />
          {provider.isPromoted ? <Badge label={t('marketplacePromoted')} tone="accent" /> : null}
          {provider.verifiedByOwner ? (
            <Badge label={t('marketplaceVerifiedBadge')} tone="primary" />
          ) : null}
        </View>
      </View>

      {provider.bio ? (
        <Text style={[typography.body, { color: theme.text, marginTop: space.sm }]} numberOfLines={2}>
          {provider.bio}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        {provider.hourlyRate != null ? (
          <Text style={[typography.caption, { color: theme.text }]}>
            {t('marketplaceRateLabel', { rate: provider.hourlyRate })}
          </Text>
        ) : null}
        {distanceLabel ? (
          <Text style={[typography.caption, { color: theme.muted }]}>{distanceLabel}</Text>
        ) : null}
      </View>

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
            <IconButton
              icon={Phone}
              accessibilityLabel={t('marketplaceContactCall')}
              onPress={call}
              color={theme.primary}
            />
          ) : null}
          {provider.whatsapp ? (
            <IconButton
              icon={MessageCircle}
              accessibilityLabel={t('marketplaceContactWhatsapp')}
              onPress={whatsapp}
              color={theme.primary}
            />
          ) : null}
          {provider.email ? (
            <IconButton
              icon={Mail}
              accessibilityLabel={t('marketplaceContactEmail')}
              onPress={email}
              color={theme.primary}
            />
          ) : null}
          {provider.latitude != null && provider.longitude != null ? (
            <IconButton
              icon={MapPin}
              accessibilityLabel={provider.name}
              onPress={onPress}
              color={theme.primary}
            />
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.md },
  header: { gap: space.sm },
  title: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.sm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.md,
  },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  actions: { flexDirection: 'row' },
});
