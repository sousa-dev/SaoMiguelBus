import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@/lib/theme';

export function OfflineBanner() {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.banner, { backgroundColor: theme.secondary }]}>
      <Text style={styles.text}>{t('offlineBanner')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  text: { color: '#fff', fontWeight: '600', textAlign: 'center' },
});
