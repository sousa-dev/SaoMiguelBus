import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { track } from '@/lib/analytics';
import { space } from '@/lib/tokens';
import type { MarketplaceProvider } from '@/lib/types';

function digits(value: string): string {
  return value.replace(/[^\d+]/g, '');
}

export function ContactRow({ provider }: { provider: MarketplaceProvider }) {
  const { t } = useTranslation();

  const open = (action: 'call' | 'whatsapp' | 'email', url: string) => {
    track('marketplace', 'engage', { action, provider_id: provider.id });
    void Linking.openURL(url);
  };

  const actions: { key: 'call' | 'whatsapp' | 'email'; label: string; url: string }[] = [];
  if (provider.phone) {
    actions.push({ key: 'call', label: t('marketplaceContactCall'), url: `tel:${digits(provider.phone)}` });
  }
  if (provider.whatsapp) {
    actions.push({
      key: 'whatsapp',
      label: t('marketplaceContactWhatsapp'),
      url: `https://wa.me/${digits(provider.whatsapp).replace('+', '')}`,
    });
  }
  if (provider.email) {
    actions.push({ key: 'email', label: t('marketplaceContactEmail'), url: `mailto:${provider.email}` });
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {actions.map((a) => (
        <Button
          key={a.key}
          label={a.label}
          variant="secondary"
          onPress={() => open(a.key, a.url)}
          style={{ flexGrow: 1 }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginVertical: space.md },
});
