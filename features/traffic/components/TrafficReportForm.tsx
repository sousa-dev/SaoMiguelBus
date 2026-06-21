import { ThemedDateTimePicker } from '@/components/ui/ThemedDateTimePicker';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { ReportLocationField } from '@/features/traffic/components/ReportLocationField';
import { trafficCategoryIcon } from '@/lib/traffic-icons';
import { formatAppDateTime } from '@/lib/date-format';
import { isWithinIslandBounds } from '@/lib/island-map';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { TrafficCategory, TrafficReportWriteInput } from '@/lib/types';

/** Fallback "valid until" window when a category has no TTL (≈ 2h). */
const DEFAULT_TTL_MINUTES = 120;

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
  const [validUntil, setValidUntil] = useState(() => new Date(Date.now() + DEFAULT_TTL_MINUTES * 60_000));
  const [validUntilTouched, setValidUntilTouched] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showValidUntilPicker, setShowValidUntilPicker] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const selected = useMemo(() => categories.find((c) => c.slug === slug), [categories, slug]);
  const canSchedule = !!selected?.isSchedulable;
  const coordsValid = coords ? isWithinIslandBounds(coords.lat, coords.lng) : false;
  const canSubmit = !!slug && coordsValid && !submitting && !offline;

  // Default the "valid until" to the category's TTL until the user edits it.
  useEffect(() => {
    if (validUntilTouched) {
      return;
    }
    const ttl = selected?.defaultTtlMinutes ?? DEFAULT_TTL_MINUTES;
    setValidUntil(new Date(Date.now() + ttl * 60_000));
  }, [selected?.defaultTtlMinutes, validUntilTouched]);

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
      active_until: validUntil.toISOString(),
    };
    if (canSchedule && scheduled) {
      input.active_from = startAt.toISOString();
    }
    onSubmit(input);
  };

  const formatWhen = (d: Date) => formatAppDateTime(d);

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
                  <ThemedDateTimePicker
                    value={startAt}
                    mode="datetime"
                    onChange={(_, date) => {
                      if (Platform.OS === 'android') {
                        setShowStartPicker(false);
                      }
                      if (date) {
                        setStartAt(date);
                        if (date >= validUntil) {
                          setValidUntil(new Date(date.getTime() + 3600_000));
                          setValidUntilTouched(true);
                        }
                      }
                    }}
                  />
                ) : null}
              </>
            ) : null}
          </Card>
        ) : null}

        <Card elevated style={styles.section}>
          <Text style={[typography.label, { color: theme.text }]}>{t('trafficValidUntil')}</Text>
          <Pressable onPress={() => setShowValidUntilPicker(true)} style={[styles.timeField, { borderColor: theme.border }]}>
            <Text style={[typography.body, { color: theme.text }]}>{formatWhen(validUntil)}</Text>
          </Pressable>
          {showValidUntilPicker ? (
            <ThemedDateTimePicker
              value={validUntil}
              mode="datetime"
              minimumDate={canSchedule && scheduled ? startAt : new Date()}
              onChange={(_, date) => {
                if (Platform.OS === 'android') {
                  setShowValidUntilPicker(false);
                }
                if (date) {
                  setValidUntil(date);
                  setValidUntilTouched(true);
                }
              }}
            />
          ) : null}
        </Card>

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
