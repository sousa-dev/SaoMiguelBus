import { ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@/lib/auth-store';
import { useAppTheme } from '@/lib/theme';
import { radius, space, typography } from '@/lib/tokens';

/** Compact "Admin" pill for Django superusers on Settings. */
export function AdminBadge() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isSuperuser = useAuthStore((s) => s.user?.isSuperuser);

  if (!isSuperuser) {
    return null;
  }

  return (
    <View style={[styles.pill, { backgroundColor: theme.primary }]}>
      <ShieldCheck size={12} color={theme.onPrimary} />
      <Text style={[typography.caption, styles.label, { color: theme.onPrimary }]}>
        {t('accountAdminBadge')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  label: { fontWeight: '700' },
});
