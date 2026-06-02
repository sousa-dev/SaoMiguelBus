import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { track } from '@/lib/analytics';
import type { MarketplaceProvider } from '@/lib/types';
import type { AppTheme } from '@/lib/theme';

function digits(value: string): string {
  return value.replace(/[^\d+]/g, '');
}

export function ContactRow({
  provider,
  theme,
}: {
  provider: MarketplaceProvider;
  theme: AppTheme;
}) {
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
        <Pressable
          key={a.key}
          onPress={() => open(a.key, a.url)}
          style={[styles.btn, { backgroundColor: theme.secondary }]}
        >
          <Text style={styles.btnText}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  btn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, flexGrow: 1, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
