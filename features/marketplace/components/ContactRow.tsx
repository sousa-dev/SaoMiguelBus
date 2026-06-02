import { Linking, StyleSheet, View } from 'react-native';
import { Mail, MessageCircle, Navigation, Phone } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { track } from '@/lib/analytics';
import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { MarketplaceProvider } from '@/lib/types';

function digits(value: string): string {
  return value.replace(/[^\d+]/g, '');
}

export function ContactRow({ provider }: { provider: MarketplaceProvider }) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const open = (action: 'call' | 'whatsapp' | 'email' | 'directions', url: string) => {
    track('marketplace', 'engage', { action, provider_id: provider.id });
    void Linking.openURL(url);
  };

  const hasLocation = provider.latitude != null && provider.longitude != null;

  return (
    <View style={styles.row}>
      {provider.phone ? (
        <IconButton
          icon={Phone}
          color={theme.primary}
          accessibilityLabel={t('marketplaceContactCall')}
          onPress={() => open('call', `tel:${digits(provider.phone)}`)}
        />
      ) : null}
      {provider.whatsapp ? (
        <IconButton
          icon={MessageCircle}
          color={theme.primary}
          accessibilityLabel={t('marketplaceContactWhatsapp')}
          onPress={() =>
            open('whatsapp', `https://wa.me/${digits(provider.whatsapp).replace('+', '')}`)
          }
        />
      ) : null}
      {provider.email ? (
        <IconButton
          icon={Mail}
          color={theme.primary}
          accessibilityLabel={t('marketplaceContactEmail')}
          onPress={() => open('email', `mailto:${provider.email}`)}
        />
      ) : null}
      {hasLocation ? (
        <IconButton
          icon={Navigation}
          color={theme.primary}
          accessibilityLabel={t('marketplaceContactDirections')}
          onPress={() =>
            open(
              'directions',
              `https://www.google.com/maps?q=${provider.latitude},${provider.longitude}`,
            )
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginVertical: space.md },
});
