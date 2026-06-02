import { Bell } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AlertsModal } from '@/features/transit/components/AlertsModal';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { track } from '@/lib/analytics';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export function AlertBell() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const bootstrap = useBootstrap();
  const infos = bootstrap.data?.infos ?? [];
  const [open, setOpen] = useState(false);

  if (infos.length === 0) {
    return null;
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('transitAlertsTitle')}
        onPress={() => {
          track('transit', 'alert_open', { count: infos.length });
          setOpen(true);
        }}
        style={styles.bell}
      >
        <Bell size={22} color={theme.primary} />
        <View style={[styles.badge, { backgroundColor: theme.danger }]}>
          <Text style={[typography.caption, { color: theme.onPrimary, fontWeight: '700' }]}>
            {infos.length}
          </Text>
        </View>
      </Pressable>
      <AlertsModal visible={open} infos={infos} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  bell: { padding: space.xs, marginRight: space.sm },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
