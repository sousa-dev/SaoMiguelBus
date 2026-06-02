import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import {
  useConfirmTrafficReport,
  useDeleteTrafficReport,
  useTrafficReport,
} from '@/features/traffic/hooks/useTrafficQueries';
import { useAppTheme } from '@/lib/theme';
import { useTrafficStore } from '@/lib/traffic-store';

export default function TrafficDetailScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const reportId = Number(params.id);

  const report = useTrafficReport(reportId);
  const confirm = useConfirmTrafficReport(reportId);
  const remove = useDeleteTrafficReport();
  const isMine = useTrafficStore((s) => s.isMine(reportId));
  const removeFromStore = useTrafficStore((s) => s.removeReport);

  const confirmDelete = () => {
    Alert.alert(t('trafficDeleteAction'), t('trafficDeleteConfirm'), [
      { text: t('trafficCancel'), style: 'cancel' },
      {
        text: t('trafficDeleteAction'),
        style: 'destructive',
        onPress: async () => {
          await remove.mutateAsync(reportId);
          removeFromStore(reportId);
          router.back();
        },
      },
    ]);
  };

  if (report.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (report.isError || !report.data) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.muted }}>{t('trafficLoadError')}</Text>
      </View>
    );
  }

  const r = report.data;

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.icon}>{r.category.icon || '⚠️'}</Text>
        <Text style={[styles.name, { color: theme.text }]}>{r.category.name}</Text>
      </View>
      {r.status === 'scheduled' ? (
        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
          <Text style={styles.badgeText}>{t('trafficScheduledBadge')}</Text>
        </View>
      ) : null}

      {r.road ? <Text style={{ color: theme.text, marginTop: 12 }}>{r.road}</Text> : null}
      {r.description ? (
        <Text style={{ color: theme.text, marginTop: 8, lineHeight: 20 }}>{r.description}</Text>
      ) : null}

      <Text style={{ color: theme.muted, marginTop: 16 }}>
        {t('trafficConfidence', { confirm: r.confidence.confirm, deny: r.confidence.deny })}
      </Text>

      <View style={styles.voteRow}>
        <Pressable
          disabled={confirm.isPending}
          onPress={() => confirm.mutate('still_there')}
          style={[styles.voteBtn, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.voteText}>{t('trafficStillThere')}</Text>
        </Pressable>
        <Pressable
          disabled={confirm.isPending}
          onPress={() => confirm.mutate('gone')}
          style={[styles.voteBtn, { borderColor: theme.border, borderWidth: 1 }]}
        >
          <Text style={{ color: theme.text, fontWeight: '700' }}>{t('trafficGone')}</Text>
        </Pressable>
      </View>

      {isMine ? (
        <Pressable onPress={confirmDelete} style={[styles.deleteBtn, { borderColor: '#c0392b' }]}>
          <Text style={{ color: '#c0392b', fontWeight: '600' }}>{t('trafficDeleteAction')}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 30 },
  name: { fontSize: 22, fontWeight: '800', flexShrink: 1 },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 8 },
  badgeText: { color: '#1a1a1a', fontSize: 11, fontWeight: '700' },
  voteRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  voteBtn: { flexGrow: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 12 },
  voteText: { color: '#fff', fontWeight: '700' },
  deleteBtn: { marginTop: 20, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});
