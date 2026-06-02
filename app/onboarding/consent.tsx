import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { defaultPurposes, useConsentStore } from '@/lib/consent-store';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { ConsentPurposes } from '@/lib/types';

export default function ConsentScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const acceptAll = useConsentStore((s) => s.acceptAll);
  const rejectNonEssential = useConsentStore((s) => s.rejectNonEssential);
  const saveCustom = useConsentStore((s) => s.saveCustom);
  const bootstrap = useBootstrap();
  const policyVersion = bootstrap.data?.consentPolicyVersion;
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

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[typography.display, { color: theme.primary }]}>{t('consentTitle')}</Text>
        <Text style={[typography.body, { color: theme.text, marginVertical: space.lg }]}>{t('consentIntro')}</Text>

        <PurposeRow
          label={t('consentPurposeNecessary')}
          description={t('consentPurposeNecessaryDesc')}
          value
          disabled
          onToggle={() => undefined}
        />
        <PurposeRow
          label={t('consentPurposeAnalytics')}
          description={t('consentPurposeAnalyticsDesc')}
          value={purposes.analytics}
          onToggle={() => toggle('analytics')}
        />
        <PurposeRow
          label={t('consentPurposeAds')}
          description={t('consentPurposeAdsDesc')}
          value={purposes.ads}
          onToggle={() => toggle('ads')}
        />
        <PurposeRow
          label={t('consentPurposePersonalization')}
          description={t('consentPurposePersonalizationDesc')}
          value={purposes.personalization}
          onToggle={() => toggle('personalization')}
        />

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
  label,
  description,
  value,
  disabled,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: theme.text }]}>{label}</Text>
        <Text style={[typography.caption, { color: theme.muted, marginTop: 2 }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: theme.outline, true: theme.primary }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space['4xl'] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: space.lg,
    marginBottom: space.md,
  },
});
