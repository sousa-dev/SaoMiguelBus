import { Bus, Info, Route } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { elevation, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export function TransitInstructionCard() {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderLeftColor: theme.info,
        },
        elevation(1, theme.text),
      ]}
    >
      <View style={styles.titleRow}>
        <Info size={22} color={theme.info} />
        <Text style={[typography.headline, { color: theme.info, flex: 1, marginLeft: space.sm }]}>
          {t('homeInstructionsTitle')}
        </Text>
        <Bus size={22} color={theme.primary} />
      </View>
      <Text style={[typography.body, { color: theme.info, marginTop: space.md }]}>
        {t('homeInstructionsText')}
      </Text>
      <View
        style={[
          styles.hint,
          {
            backgroundColor: theme.infoSurface,
            borderLeftColor: theme.info,
          },
        ]}
      >
        <View style={[styles.routeIcon, { backgroundColor: theme.primary }]}>
          <Route size={14} color={theme.onPrimary} />
        </View>
        <Text style={[typography.body, { color: theme.text, flex: 1 }]}>{t('homeInstructionsText2')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 4,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.md,
    borderLeftWidth: 4,
    borderRadius: radius.sm,
    padding: space.md,
  },
  routeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
