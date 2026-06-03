import { Store } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  MARKETPLACE_REGISTER_URL,
  shareMarketplaceListingInvite,
} from '@/features/marketplace/share-listing-invite';
import { iconSize, space, typography } from '@/lib/tokens';
import { primaryTint, useAppTheme } from '@/lib/theme';

/** Footer CTA encouraging users to invite businesses to register on servicos.saomiguelhub.com. */
export function MarketplaceRegisterCta() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const onShare = () =>
    void shareMarketplaceListingInvite(
      t('fabShareMarketplaceInviteMessage', { url: MARKETPLACE_REGISTER_URL }),
      { title: t('fabShareMarketplaceInvite'), alertTitle: t('fabShareMarketplaceInvite') },
    );

  return (
    <Card elevated style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: primaryTint(theme) }]}>
        <Store size={iconSize.lg} color={theme.primary} strokeWidth={2} />
      </View>
      <Text style={[typography.headline, styles.title, { color: theme.text }]}>
        {t('marketplaceRegisterCtaTitle')}
      </Text>
      <Text style={[typography.body, styles.body, { color: theme.muted }]}>
        {t('marketplaceRegisterCtaBody')}
      </Text>
      <Button
        label={t('marketplaceAddListing')}
        variant="primary"
        fullWidth
        onPress={() => router.push('/(tabs)/marketplace/new' as Href)}
        style={styles.btn}
      />
      <Button
        label={t('marketplaceRegisterCtaShare')}
        variant="outline"
        fullWidth
        onPress={onShare}
        style={styles.btnSecondary}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: space.lg,
    padding: space.lg,
    alignItems: 'stretch',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: space.md,
  },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', marginTop: space.sm, lineHeight: 22 },
  btn: { marginTop: space.lg },
  btnSecondary: { marginTop: space.sm },
});
