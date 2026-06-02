import type { LucideIcon } from 'lucide-react-native';
import React, { useLayoutEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { BarChart3, Lock, Megaphone, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { useBootstrapCached } from '@/features/transit/hooks/useTransitQueries';
import { defaultPurposes, useConsentStore } from '@/lib/consent-store';
import { useNetworkStatus } from '@/lib/network-status';
import { useAppStackScreenOptions } from '@/lib/navigation';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { ConsentPurposes } from '@/lib/types';

export default function ConsentScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const screenOptions = useAppStackScreenOptions();
  const { isOnline } = useNetworkStatus();
  const acceptAll = useConsentStore((s) => s.acceptAll);
  const rejectNonEssential = useConsentStore((s) => s.rejectNonEssential);
  const saveCustom = useConsentStore((s) => s.saveCustom);
  const { data: bootstrap } = useBootstrapCached();
  const policyVersion = bootstrap?.consentPolicyVersion;
  const decided = useConsentStore((s) => s.decided);
  const storedPurposes = useConsentStore((s) => s.purposes);
  const [purposes, setPurposes] = useState<ConsentPurposes>(() =>
    decided ? { ...storedPurposes } : { ...defaultPurposes },
  );
  const [busy, setBusy] = useState(false);

  const toggle = (key: keyof ConsentPurposes) => {
    if (key === 'strictly_necessary') {
      return;
    }
    setPurposes((p) => ({ ...p, [key]: !p[key] }));
  };

  const wrap = async (fn: () => Promise<void>) => {
    const wasDecided = decided;
    setBusy(true);
    try {
      await fn();
      if (wasDecided) {
        router.back();
      } else {
        router.replace('/(tabs)/hub');
      }
    } finally {
      setBusy(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      ...screenOptions,
      headerShown: true,
      title: t('consentTitle'),
      presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
      ...(Platform.OS === 'ios'
        ? {
            sheetGrabberVisible: true,
            sheetAllowedDetents: [1],
            sheetExpandsWhenScrolledToEdge: true,
          }
        : {}),
    });
  }, [navigation, screenOptions, t]);

  return (
    <Screen withStackHeader collapsable={false}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={[styles.hero, { backgroundColor: theme.surfaceVariant }]}>
            <ShieldCheck size={48} color={theme.primary} strokeWidth={1.5} />
          </View>
          <Text style={[typography.display, { color: theme.primary, marginTop: space.lg }]}>{t('consentTitle')}</Text>
          <Text style={[typography.body, { color: theme.text, marginVertical: space.lg }]}>{t('consentIntro')}</Text>

          {!isOnline ? <Banner variant="offline" message={t('consentOfflineBanner')} /> : null}

          <View style={[styles.group, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <PurposeRow
              icon={Lock}
              label={t('consentPurposeNecessary')}
              description={t('consentPurposeNecessaryDesc')}
              value
              disabled
              onToggle={() => undefined}
            />
            <PurposeRow
              icon={BarChart3}
              label={t('consentPurposeAnalytics')}
              description={t('consentPurposeAnalyticsDesc')}
              value={purposes.analytics}
              onToggle={() => toggle('analytics')}
            />
            <PurposeRow
              icon={Megaphone}
              label={t('consentPurposeAds')}
              description={t('consentPurposeAdsDesc')}
              value={purposes.ads}
              onToggle={() => toggle('ads')}
            />
            <PurposeRow
              icon={Sparkles}
              label={t('consentPurposePersonalization')}
              description={t('consentPurposePersonalizationDesc')}
              value={purposes.personalization}
              onToggle={() => toggle('personalization')}
            />
          </View>

          <Button
            label={t('consentAcceptAll')}
            disabled={busy}
            onPress={() => wrap(() => acceptAll(policyVersion))}
            fullWidth
            style={{ marginTop: space.lg }}
          />
          <Button
            label={t('consentRejectNonEssential')}
            variant="outline"
            disabled={busy}
            onPress={() => wrap(() => rejectNonEssential(policyVersion))}
            fullWidth
            style={{ marginTop: space.md }}
          />
          <Button
            label={t('consentSaveChoices')}
            variant="secondary"
            disabled={busy}
            onPress={() => wrap(() => saveCustom(purposes, policyVersion))}
            fullWidth
            style={{ marginTop: space.md }}
          />
        </ScrollView>
    </Screen>
  );
}

function PurposeRow({
  icon,
  label,
  description,
  value,
  disabled,
  onToggle,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const theme = useAppTheme();
  return (
    <ListRow
      icon={icon}
      title={label}
      subtitle={description}
      showChevron={false}
      trailing={
        <Switch
          value={value}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ false: theme.outline, true: theme.primary }}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space['4xl'] },
  hero: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  group: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
