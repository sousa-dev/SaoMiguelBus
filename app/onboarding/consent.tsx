import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { defaultPurposes, useConsentStore } from '@/lib/consent-store';
import { useAppTheme } from '@/lib/theme';
import type { ConsentPurposes } from '@/lib/types';

export default function ConsentScreen() {
  const theme = useAppTheme();
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
        router.replace('/(tabs)/transit');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.primary }]}>Privacy & consent</Text>
        <Text style={{ color: theme.text, marginBottom: 20 }}>
          Choose how São Miguel Bus may use your data. Analytics and ads stay off until you opt in.
        </Text>

        <PurposeRow
          label="Strictly necessary"
          description="Core app functionality"
          value
          disabled
          onToggle={() => undefined}
          theme={theme}
        />
        <PurposeRow
          label="Analytics"
          description="Anonymous usage to improve routes"
          value={purposes.analytics}
          onToggle={() => toggle('analytics')}
          theme={theme}
        />
        <PurposeRow
          label="Ads"
          description="Personalized advertising"
          value={purposes.ads}
          onToggle={() => toggle('ads')}
          theme={theme}
        />
        <PurposeRow
          label="Personalization"
          description="Recommendations and notifications"
          value={purposes.personalization}
          onToggle={() => toggle('personalization')}
          theme={theme}
        />

        <Pressable
          disabled={busy}
          onPress={() => wrap(() => acceptAll(policyVersion))}
          style={[styles.btn, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.btnText}>Accept all</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => wrap(() => rejectNonEssential(policyVersion))}
          style={[styles.btn, styles.btnOutline, { borderColor: theme.secondary }]}
        >
          <Text style={{ color: theme.secondary, fontWeight: '600' }}>Reject non-essential</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => wrap(() => saveCustom(purposes, policyVersion))}
          style={[styles.btn, { backgroundColor: theme.secondary }]}
        >
          <Text style={styles.btnText}>Save choices</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function PurposeRow({
  label,
  description,
  value,
  disabled,
  onToggle,
  theme,
}: {
  label: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: theme.muted, fontSize: 13 }}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onToggle} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  btn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1 },
  btnText: { color: '#fff', fontWeight: '700' },
});
