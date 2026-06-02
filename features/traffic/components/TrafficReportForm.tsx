import DateTimePicker from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { ReportLocationField } from '@/features/traffic/components/ReportLocationField';
import { trafficCategoryIcon } from '@/lib/traffic-icons';
import { isWithinIslandBounds } from '@/lib/island-map';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { TrafficCategory, TrafficReportWriteInput } from '@/lib/types';

type Props = {
  categories: TrafficCategory[];
  initialCategory?: string;
  coords: { lat: number; lng: number } | null;
  gpsCoords?: { lat: number; lng: number } | null;
  userOnIsland?: boolean;
  onCoordsChange: (coords: { lat: number; lng: number }) => void;
  submitting: boolean;
  error: string | null;
  offline?: boolean;
  onSubmit: (input: TrafficReportWriteInput) => void;
};

export function TrafficReportForm({
  categories,
  initialCategory,
  coords,
  gpsCoords,
  userOnIsland,
  onCoordsChange,
  submitting,
  error,
  offline,
  onSubmit,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [slug, setSlug] = useState<string | null>(initialCategory ?? null);
  const [road, setRoad] = useState('');
  const [description, setDescription] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [startAt, setStartAt] = useState(() => new Date(Date.now() + 3600_000));
  const [endAt, setEndAt] = useState(() => new Date(Date.now() + 3 * 3600_000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const selected = useMemo(() => categories.find((c) => c.slug === slug), [categories, slug]);
  const canSchedule = !!selected?.isSchedulable;
  const coordsValid = coords ? isWithinIslandBounds(coords.lat, coords.lng) : false;
  const canSubmit = !!slug && coordsValid && !submitting && !offline;

  const submit = () => {
    if (!slug) {
      setCategoryError(t('trafficCategoryRequired'));
      return;
    }
    if (!coords || !coordsValid) {
      return;
    }
    setCategoryError(null);
    const input: TrafficReportWriteInput = {
      category_slug: slug,
      latitude: coords.lat,
      longitude: coords.lng,
      description: description.trim() || undefined,
      road: road.trim() || undefined,
    };
    if (canSchedule && scheduled) {
      input.active_from = startAt.toISOString();
      input.active_until = endAt.toISOString();
    }
    onSubmit(input);
  };

  const formatWhen = (d: Date) =>
    d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {offline ? <Banner variant="offline" message={t('offlineBanner')} /> : null}
        {error ? <Banner variant="danger" message={error} /> : null}

        <Card elevated>
          <Text style={[typography.overline, { color: theme.muted, marginBottom: space.md }]}>
            {t('trafficCategory')}
          </Text>
          <View style={styles.grid}>
            {categories.map((c) => {
              const Icon = trafficCategoryIcon(c.slug);
              const active = c.slug === slug;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setSlug(c.slug);
                    setCategoryError(null);
                  }}
                  style={[
                    styles.categoryTile,
                    {
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? theme.primary : theme.card,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={c.name}
                >
                  <Icon size={22} color={active ? theme.onPrimary : theme.primary} strokeWidth={2} />
                  <Text
                    style={[
                      typography.caption,
                      { color: active ? theme.onPrimary : theme.text, marginTop: 4, textAlign: 'center' },
                    ]}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {categoryError ? (
            <Text style={[typography.caption, { color: theme.danger, marginTop: space.sm }]}>{categoryError}</Text>
          ) : null}
        </Card>

        <ReportLocationField
          coords={coords}
          gpsCoords={gpsCoords}
          userOnIsland={userOnIsland}
          onCoordsChange={onCoordsChange}
        />

        <Card elevated style={styles.section}>
          <Field
            label={t('trafficRoad')}
            value={road}
            onChangeText={setRoad}
            placeholder={t('trafficRoadPlaceholder')}
          />
          <Field
            label={t('trafficDescription')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('trafficDescriptionPlaceholder')}
            multiline
            numberOfLines={4}
          />
        </Card>

        {canSchedule ? (
          <Card elevated style={styles.section}>
            <View style={styles.scheduleRow}>
              <Text style={[typography.bodyStrong, { color: theme.text }]}>{t('trafficScheduleToggle')}</Text>
              <Switch
                value={scheduled}
                onValueChange={setScheduled}
                trackColor={{ false: theme.outline, true: theme.primary }}
              />
            </View>
            {scheduled ? (
              <>
                <Text style={[typography.label, { color: theme.text, marginTop: space.md }]}>
                  {t('trafficScheduleStart')}
                </Text>
                <Pressable onPress={() => setShowStartPicker(true)} style={[styles.timeField, { borderColor: theme.border }]}>
                  <Text style={[typography.body, { color: theme.text }]}>{formatWhen(startAt)}</Text>
                </Pressable>
                {showStartPicker ? (
                  <DateTimePicker
                    value={startAt}
                    mode="datetime"
                    onChange={(_, date) => {
                      if (Platform.OS === 'android') {
                        setShowStartPicker(false);
                      }
                      if (date) {
                        setStartAt(date);
                        if (date >= endAt) {
                          setEndAt(new Date(date.getTime() + 3600_000));
                        }
                      }
                    }}
                  />
                ) : null}

                <Text style={[typography.label, { color: theme.text, marginTop: space.md }]}>
                  {t('trafficScheduleEnd')}
                </Text>
                <Pressable onPress={() => setShowEndPicker(true)} style={[styles.timeField, { borderColor: theme.border }]}>
                  <Text style={[typography.body, { color: theme.text }]}>{formatWhen(endAt)}</Text>
                </Pressable>
                {showEndPicker ? (
                  <DateTimePicker
                    value={endAt}
                    mode="datetime"
                    minimumDate={startAt}
                    onChange={(_, date) => {
                      if (Platform.OS === 'android') {
                        setShowEndPicker(false);
                      }
                      if (date) {
                        setEndAt(date);
                      }
                    }}
                  />
                ) : null}
              </>
            ) : null}
          </Card>
        ) : null}

        <Button
          label={t('trafficSubmit')}
          onPress={submit}
          disabled={!canSubmit}
          loading={submitting}
          fullWidth
          style={{ marginTop: space.lg }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space['4xl'] },
  section: { marginTop: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  categoryTile: {
    width: 88,
    paddingVertical: space.md,
    paddingHorizontal: space.xs,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeField: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: space.md,
    marginTop: space.sm,
  },
});
