import { useRouter } from 'expo-router';
import { LogIn, LogOut, Trash2, UserCircle } from 'lucide-react-native';
import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PremiumBadge } from '@/features/account/components/PremiumBadge';
import { useAuth } from '@/features/account/hooks/useAuth';
import { ListRow } from '@/components/ui/ListRow';
import { useAppTheme } from '@/lib/theme';
import { space, typography } from '@/lib/tokens';

/** Account block for the Settings screen. Premium status lives in `PremiumSettingsSection`. */
export function AccountSection() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isSignedIn, logout, deleteAccount } = useAuth();

  const groupStyle = [styles.group, { backgroundColor: theme.card, borderColor: theme.border }];

  const confirmDeleteAccount = () => {
    Alert.alert(
      t('authDeleteAccountConfirmTitle'),
      t('authDeleteAccountConfirmMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('authDeleteAccountConfirm'),
          style: 'destructive',
          onPress: () => {
            deleteAccount.mutate(undefined, {
              onError: () => Alert.alert(t('authDeleteAccountErrorTitle'), t('authErrorUnknown')),
            });
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <>
      <Text style={[typography.overline, styles.sectionLabel, { color: theme.muted }]}>
        {t('accountSection')}
      </Text>

      {isSignedIn ? (
        <View style={groupStyle}>
          <ListRow
            icon={UserCircle}
            title={user?.displayName || user?.email || t('accountSection')}
            subtitle={user?.email}
            showChevron={false}
            trailing={<PremiumBadge />}
          />
          <ListRow
            icon={LogOut}
            title={t('authSignOut')}
            destructive
            showChevron={false}
            disabled={logout.isPending || deleteAccount.isPending}
            onPress={() => logout.mutate()}
          />
          <ListRow
            icon={Trash2}
            title={t('authDeleteAccount')}
            subtitle={t('authDeleteAccountSubtitle')}
            destructive
            showChevron={false}
            disabled={deleteAccount.isPending}
            onPress={confirmDeleteAccount}
          />
        </View>
      ) : (
        <View style={groupStyle}>
          <ListRow
            icon={LogIn}
            title={t('authSignInCta')}
            subtitle={t('authSignInSubtitle')}
            onPress={() => router.push('/auth/sign-in')}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginTop: space['2xl'], marginBottom: space.sm },
  group: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
