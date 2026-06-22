import { Clock, CreditCard, Crown, LogIn, RotateCcw, Sparkles } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ListRow } from '@/components/ui/ListRow';
import { useAuth } from '@/features/account/hooks/useAuth';
import { useEntitlement } from '@/features/account/hooks/useEntitlement';
import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { usePremiumPurchases } from '@/features/premium/hooks/usePremiumPurchases';
import { presentCustomerCenter } from '@/features/premium/lib/customer-center';
import { isTouristPassEntitlement } from '@/features/premium/lib/is-tourist-pass-entitlement';
import { NATIVE_SUBSCRIPTIONS_URL, resolveManageAction } from '@/features/premium/lib/manage-action';
import { isPurchaseCancelled, purchaseErrorMessageKey } from '@/features/premium/lib/purchase-errors';
import { getPremiumDaysRemaining } from '@/features/premium/lib/premium-time-remaining';
import { formatAppDate } from '@/lib/date-format';
import { LEGAL_URLS } from '@/lib/legal-urls';
import { usePremium } from '@/lib/premium-store';
import { CUSTOMER_CENTER_ENABLED, hasPremiumEntitlement } from '@/lib/revenuecat';
import { useAppTheme } from '@/lib/theme';
import { space, typography } from '@/lib/tokens';
import type { ManageVia } from '@/lib/types';

const MANAGE_KEY: Record<ManageVia, string> = {
  app_store: 'premiumManageAppStore',
  play_store: 'premiumManagePlayStore',
  stripe: 'premiumManageStripe',
  none: 'premiumManageNone',
};

const PASS_COUNTDOWN_REFRESH_MS = 60 * 60 * 1000;

function passExpirySubtitle(
  t: (key: string, options?: { count?: number }) => string,
  daysRemaining: number,
  endIso: string,
): string {
  const relative =
    daysRemaining <= 1
      ? t('premiumExpiresInOneDay')
      : t('premiumExpiresInDays', { count: daysRemaining });
  return `${relative} · ${t('premiumExpires')}${formatAppDate(endIso)}`;
}

/** Premium status + self-service management for the Settings screen. */
export function PremiumSettingsSection() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const entitlement = useEntitlement();
  const isPremium = usePremium();
  const { openPaywall } = usePaywall();
  const { restore } = usePremiumPurchases();
  const [, setCountdownTick] = useState(0);

  const isTouristPass = isTouristPassEntitlement(entitlement);
  const daysRemaining = getPremiumDaysRemaining(entitlement?.currentPeriodEnd);

  useEffect(() => {
    if (!isTouristPass || daysRemaining <= 0) {
      return;
    }
    const timer = setInterval(() => setCountdownTick((n) => n + 1), PASS_COUNTDOWN_REFRESH_MS);
    return () => clearInterval(timer);
  }, [isTouristPass, daysRemaining, entitlement?.currentPeriodEnd]);

  const manageAction = resolveManageAction({
    source: entitlement?.source ?? null,
    manageVia: entitlement?.manageVia ?? 'none',
    customerCenterEnabled: CUSTOMER_CENTER_ENABLED,
  });

  const showManageRow =
    isPremium &&
    !isTouristPass &&
    (manageAction.kind === 'customer_center' || manageAction.kind === 'native_subscriptions');

  const showPassExpiryRow = isPremium && isTouristPass && daysRemaining > 0;

  const statusSubtitle = (() => {
    if (!isPremium) {
      return t('premiumUpsell');
    }
    if (isTouristPass) {
      return t('premiumManageNone');
    }
    if (entitlement?.currentPeriodEnd) {
      return `${t('premiumExpires')}${formatAppDate(entitlement.currentPeriodEnd)}`;
    }
    return t(MANAGE_KEY[entitlement?.manageVia ?? 'none']);
  })();

  const onManage = async () => {
    switch (manageAction.kind) {
      case 'customer_center': {
        const ok = await presentCustomerCenter();
        if (!ok) {
          void Linking.openURL(NATIVE_SUBSCRIPTIONS_URL);
        }
        break;
      }
      case 'native_subscriptions':
        void Linking.openURL(NATIVE_SUBSCRIPTIONS_URL);
        break;
      case 'web_portal':
      case 'informational':
        break;
    }
  };

  const onRestore = async () => {
    try {
      const info = await restore.mutateAsync();
      Alert.alert(
        t('premiumRestoreTitle'),
        hasPremiumEntitlement(info) ? t('premiumRestoreSuccess') : t('premiumRestoreNone'),
      );
    } catch (error) {
      if (isPurchaseCancelled(error)) {
        return;
      }
      Alert.alert(t('premiumRestoreTitle'), t(purchaseErrorMessageKey(error)));
    }
  };

  const groupStyle = [styles.group, { backgroundColor: theme.card, borderColor: theme.border }];

  return (
    <>
      <Text style={[typography.overline, styles.sectionLabel, { color: theme.muted }]}>
        {t('settingsPremium')}
      </Text>
      <View style={groupStyle}>
        <ListRow
          icon={Sparkles}
          title={isPremium ? t('premiumActive') : t('premiumNotActive')}
          subtitle={statusSubtitle}
          showChevron={false}
        />

        {isPremium ? null : (
          <ListRow icon={Crown} title={t('premiumGoPremium')} onPress={() => void openPaywall('settings')} />
        )}

        {isPremium && !isSignedIn ? (
          <ListRow
            icon={LogIn}
            title={t('premiumSignInToSync')}
            subtitle={t('premiumSignInToSyncSubtitle')}
            onPress={() => router.push('/auth/sign-in')}
          />
        ) : null}

        {showPassExpiryRow && entitlement?.currentPeriodEnd ? (
          <ListRow
            icon={Clock}
            title={
              daysRemaining <= 1
                ? t('premiumExpiresInOneDay')
                : t('premiumExpiresInDays', { count: daysRemaining })
            }
            subtitle={passExpirySubtitle(t, daysRemaining, entitlement.currentPeriodEnd)}
            showChevron={false}
          />
        ) : null}

        {showManageRow ? (
          <ListRow
            icon={CreditCard}
            title={t('premiumManageSubscription')}
            subtitle={t(MANAGE_KEY[entitlement?.manageVia ?? 'none'])}
            onPress={() => void onManage()}
          />
        ) : null}

        <ListRow
          icon={RotateCcw}
          title={t('premiumRestore')}
          onPress={() => void onRestore()}
          showChevron={false}
          divider={!isPremium}
        />

        {isPremium ? null : (
          <View style={styles.legalBlock}>
            <Text style={[typography.caption, styles.legalText, { color: theme.muted }]}>
              {t('premiumTerms')}
            </Text>
            <View style={styles.legalLinks}>
              <Pressable
                accessibilityRole="link"
                onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}
              >
                <Text style={[typography.caption, styles.legalLink, { color: theme.primary }]}>
                  {t('termsAndConditions')}
                </Text>
              </Pressable>
              <Text style={[typography.caption, { color: theme.muted }]}> · </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)}
              >
                <Text style={[typography.caption, styles.legalLink, { color: theme.primary }]}>
                  {t('privacyPolicy')}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginTop: space['2xl'], marginBottom: space.sm },
  group: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  legalBlock: { paddingHorizontal: space.md, paddingVertical: space.md },
  legalText: { textAlign: 'center', lineHeight: 18 },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.xs,
    flexWrap: 'wrap',
  },
  legalLink: { textDecorationLine: 'underline' },
});
