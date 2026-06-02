import { Pin, PinOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import type { HubModuleDef } from '@/lib/modules';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type HubModuleCardProps = {
  module: HubModuleDef;
  pinned: boolean;
  onTogglePin: () => void;
};

export function HubModuleCard({ module, pinned, onTogglePin }: HubModuleCardProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const Icon = module.icon;

  return (
    <Card
      onPress={() => router.push(module.route)}
      accessibilityLabel={t(module.labelKey)}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: theme.surfaceVariant }]}>
          <Icon size={28} color={theme.primary} strokeWidth={2} />
        </View>
        <View style={styles.text}>
          <Text style={[typography.headline, { color: theme.text, fontSize: 17 }]}>{t(module.labelKey)}</Text>
          <Text style={[typography.caption, { color: theme.muted, marginTop: 4 }]} numberOfLines={2}>
            {t(module.descriptionKey)}
          </Text>
        </View>
        <IconButton
          icon={pinned ? PinOff : Pin}
          variant="tonal"
          size="sm"
          accessibilityLabel={pinned ? t('hubUnpinModule') : t('hubPinModule')}
          onPress={(e) => {
            e?.stopPropagation?.();
            onTogglePin();
          }}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
});
