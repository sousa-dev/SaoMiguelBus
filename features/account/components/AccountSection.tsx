import { useRouter } from 'expo-router';
import { LogIn, LogOut, ShieldCheck, Trash2, UserCircle } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PremiumBadge } from '@/features/account/components/PremiumBadge';
import { AdminBadge } from '@/features/account/components/AdminBadge';
import { useAuth } from '@/features/account/hooks/useAuth';
import { ListRow } from '@/components/ui/ListRow';
import { confirmAction, notify } from '@/lib/confirm';
import { usePremium } from '@/lib/premium-store';
import { useAppTheme } from '@/lib/theme';
import { space, typography } from '@/lib/tokens';

/** Account block for the Settings screen. Premium status lives in `PremiumSettingsSection`. */
export function AccountSection() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isSignedIn, logout, deleteAccount } = useAuth();
  const isPremium = usePremium();

  const groupStyle = [styles.group, { backgroundColor: theme.card, borderColor: theme.border }];

  const confirmDeleteAccount = async () => {
    const confirmed = await confirmAction({
      title: t('authDeleteAccountConfirmTitle'),
      message: t('authDeleteAccountConfirmMessage'),
      confirmLabel: t('authDeleteAccountConfirm'),
      cancelLabel: t('cancel'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    deleteAccount.mutate(undefined, {
      onError: () => notify(t('authDeleteAccountErrorTitle'), t('authErrorUnknown')),
    });
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
            trailing={
              <View style={styles.badges}>
                <AdminBadge />
                <PremiumBadge />
              </View>
            }
          />
          {user?.isSuperuser ? (
            <ListRow
              icon={ShieldCheck}
              title={t('marketplaceAdminTitle')}
              subtitle={t('marketplaceAdminSubtitle')}
              onPress={() => router.push('/admin/marketplace')}
            />
          ) : null}
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
            onPress={() => void confirmDeleteAccount()}
          />
        </View>
      ) : (
        <View style={groupStyle}>
          <ListRow
            icon={LogIn}
            title={t('authSignInCta')}
            subtitle={isPremium ? t('authSignInSubtitlePremium') : t('authSignInSubtitle')}
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
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, justifyContent: 'flex-end' },
});
