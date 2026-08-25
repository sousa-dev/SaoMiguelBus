import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Globe, Mail, MessageCircle, Navigation, Phone } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { track } from '@/lib/analytics';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { MarketplaceProvider } from '@/lib/types';

function digits(value: string): string {
  return value.replace(/[^\d+]/g, '');
}

function hrefForUrl(raw: string): string {
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function ContactRow({ provider }: { provider: MarketplaceProvider }) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const open = (action: string, url: string) => {
    track('marketplace', 'engage', { action, provider_id: provider.id });
    void Linking.openURL(url);
  };

  const hasLocation = provider.latitude != null && provider.longitude != null;
  const socials = provider.socials ?? [];
  const hasWebsite = Boolean(provider.website?.trim());

  return (
    <View style={styles.wrap}>
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
        {hasWebsite ? (
          <IconButton
            icon={Globe}
            color={theme.primary}
            accessibilityLabel={t('marketplaceContactWebsite')}
            onPress={() => open('website', hrefForUrl(provider.website!))}
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
      {socials.length > 0 ? (
        <View style={styles.socialList}>
          {socials.map((link) => (
            <Pressable
              key={`${link.label}-${link.url}`}
              onPress={() => open('social', hrefForUrl(link.url))}
              style={({ pressed }) => [
                styles.socialRow,
                { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[typography.bodyStrong, { color: theme.primary }]}>{link.label}</Text>
              <Text style={[typography.caption, { color: theme.muted }]} numberOfLines={1}>
                {link.url}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: space.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  socialList: { marginTop: space.sm, gap: space.xs },
  socialRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
});
