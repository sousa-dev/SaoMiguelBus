import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import type { AppTheme } from '@/lib/theme';
import type { TrafficCategory, TrafficReportWriteInput } from '@/lib/types';

type Props = {
  theme: AppTheme;
  categories: TrafficCategory[];
  initialCategory?: string;
  coords: { lat: number; lng: number } | null;
  submitting: boolean;
  error: string | null;
  onSubmit: (input: TrafficReportWriteInput) => void;
};

/**
 * Detailed report form. Category is required; everything else optional.
 * Scheduling fields appear only for schedulable categories (e.g. radar) and
 * use an hours-from-now offset to avoid a native date-picker dependency.
 */
export function TrafficReportForm({
  theme,
  categories,
  initialCategory,
  coords,
  submitting,
  error,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const [slug, setSlug] = useState<string | null>(initialCategory ?? null);
  const [road, setRoad] = useState('');
  const [description, setDescription] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [startHours, setStartHours] = useState(1);
  const [durationHours, setDurationHours] = useState(2);

  const selected = useMemo(() => categories.find((c) => c.slug === slug), [categories, slug]);
  const canSchedule = !!selected?.isSchedulable;
  const canSubmit = !!slug && !!coords && !submitting;

  const submit = () => {
    if (!slug || !coords) {
      return;
    }
    const input: TrafficReportWriteInput = {
      category_slug: slug,
      latitude: coords.lat,
      longitude: coords.lng,
      description: description.trim() || undefined,
      road: road.trim() || undefined,
    };
    if (canSchedule && scheduled) {
      const from = new Date(Date.now() + startHours * 3600_000);
      const until = new Date(from.getTime() + durationHours * 3600_000);
      input.active_from = from.toISOString();
      input.active_until = until.toISOString();
    }
    onSubmit(input);
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.label, { color: theme.text }]}>{t('trafficCategory')}</Text>
      <View style={styles.grid}>
        {categories.map((c) => {
          const active = c.slug === slug;
          return (
            <Pressable
              key={c.id}
              onPress={() => setSlug(c.slug)}
              style={[
                styles.chip,
                {
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? theme.primary : theme.card,
                },
              ]}
            >
              <Text style={styles.chipIcon}>{c.icon || '⚠️'}</Text>
              <Text style={{ color: active ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: theme.text }]}>{t('trafficRoad')}</Text>
      <TextInput
        value={road}
        onChangeText={setRoad}
        placeholder={t('trafficRoadPlaceholder')}
        placeholderTextColor={theme.muted}
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
      />

      <Text style={[styles.label, { color: theme.text }]}>{t('trafficDescription')}</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder={t('trafficDescriptionPlaceholder')}
        placeholderTextColor={theme.muted}
        multiline
        style={[
          styles.input,
          styles.multiline,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.card },
        ]}
      />

      {canSchedule ? (
        <View style={styles.scheduleBox}>
          <View style={styles.scheduleRow}>
            <Text style={{ color: theme.text, fontWeight: '600' }}>{t('trafficScheduleToggle')}</Text>
            <Switch value={scheduled} onValueChange={setScheduled} />
          </View>
          {scheduled ? (
            <>
              <Stepper
                theme={theme}
                label={t('trafficStartIn', { hours: startHours })}
                onDec={() => setStartHours((h) => Math.max(1, h - 1))}
                onInc={() => setStartHours((h) => Math.min(72, h + 1))}
              />
              <Stepper
                theme={theme}
                label={t('trafficDuration', { hours: durationHours })}
                onDec={() => setDurationHours((h) => Math.max(1, h - 1))}
                onInc={() => setDurationHours((h) => Math.min(24, h + 1))}
              />
            </>
          ) : null}
        </View>
      ) : null}

      {!coords ? (
        <Text style={{ color: theme.muted, marginTop: 16 }}>{t('trafficLocationNeededHint')}</Text>
      ) : null}
      {error ? <Text style={{ color: '#c0392b', marginTop: 12 }}>{error}</Text> : null}

      <Pressable
        disabled={!canSubmit}
        onPress={submit}
        style={[styles.submit, { backgroundColor: theme.primary, opacity: canSubmit ? 1 : 0.5 }]}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>{t('trafficSubmit')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Stepper({
  theme,
  label,
  onDec,
  onInc,
}: {
  theme: AppTheme;
  label: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onDec} style={[styles.stepBtn, { borderColor: theme.border }]}>
        <Text style={{ color: theme.text, fontSize: 18 }}>−</Text>
      </Pressable>
      <Text style={{ color: theme.text, flex: 1, textAlign: 'center' }}>{label}</Text>
      <Pressable onPress={onInc} style={[styles.stepBtn, { borderColor: theme.border }]}>
        <Text style={{ color: theme.text, fontSize: 18 }}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { width: 90, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  chipIcon: { fontSize: 24, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  scheduleBox: { marginTop: 16 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  stepBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  submit: { marginTop: 24, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
