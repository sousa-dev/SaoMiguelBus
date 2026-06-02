import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  useConfirmTrafficReport,
  useDeleteTrafficReport,
  useTrafficReport,
} from '@/features/traffic/hooks/useTrafficQueries';
import { trafficCategoryIcon } from '@/lib/traffic-icons';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import { useTrafficStore } from '@/lib/traffic-store';

export default function TrafficDetailScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const reportId = Number(params.id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const report = useTrafficReport(reportId);
  const confirm = useConfirmTrafficReport(reportId);
  const remove = useDeleteTrafficReport();
  const isMine = useTrafficStore((s) => s.isMine(reportId));
  const removeFromStore = useTrafficStore((s) => s.removeReport);

  const runDelete = async () => {
    await remove.mutateAsync(reportId);
    removeFromStore(reportId);
    router.back();
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
  const Icon = trafficCategoryIcon(r.category.slug);

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Icon size={32} color={theme.primary} strokeWidth={2} />
        <Text style={[typography.display, { color: theme.text, fontSize: 22, flexShrink: 1 }]}>{r.category.name}</Text>
      </View>
      {r.status === 'scheduled' ? <Badge label={t('trafficScheduledBadge')} tone="accent" /> : null}

      {r.road ? <Text style={[typography.body, { color: theme.text, marginTop: space.md }]}>{r.road}</Text> : null}
      {r.description ? (
        <Text style={[typography.body, { color: theme.text, marginTop: space.sm, lineHeight: 22 }]}>{r.description}</Text>
      ) : null}

      <Text style={[typography.caption, { color: theme.muted, marginTop: space.lg }]}>
        {t('trafficConfidence', { confirm: r.confidence.confirm, deny: r.confidence.deny })}
      </Text>

      <View style={styles.voteRow}>
        <Button
          label={t('trafficStillThere')}
          onPress={() => confirm.mutate('still_there')}
          disabled={confirm.isPending}
          style={{ flex: 1 }}
        />
        <Button
          label={t('trafficGone')}
          variant="outline"
          onPress={() => confirm.mutate('gone')}
          disabled={confirm.isPending}
          style={{ flex: 1 }}
        />
      </View>

      {isMine ? (
        confirmDelete ? (
          <View style={{ marginTop: space.lg, gap: space.sm }}>
            <Text style={[typography.body, { color: theme.muted }]}>{t('trafficDeleteConfirm')}</Text>
            <Button label={t('trafficDeleteAction')} variant="danger" onPress={() => void runDelete()} />
            <Button label={t('trafficCancel')} variant="ghost" onPress={() => setConfirmDelete(false)} />
          </View>
        ) : (
          <Button
            label={t('trafficDeleteAction')}
            variant="danger"
            onPress={() => setConfirmDelete(true)}
            style={{ marginTop: space.lg }}
          />
        )
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: space.lg, paddingBottom: space['4xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  voteRow: { flexDirection: 'row', gap: space.md, marginTop: space.md },
});
