import { ArrowUpDown, Calendar, Clock } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ThemedDateTimePicker } from '@/components/ui/ThemedDateTimePicker';
import { StopPicker } from '@/features/transit/components/StopPicker';
import { formatDateLabel } from '@/lib/transit-format';
import { elevation, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { Stop } from '@/lib/types';

type Props = {
  origin: string;
  destination: string;
  date: Date;
  time: string;
  stops: Stop[];
  submitting?: boolean;
  disabled?: boolean;
  onOriginChange: (v: string) => void;
  onDestinationChange: (v: string) => void;
  onDateChange: (d: Date) => void;
  onTimeChange: (t: string) => void;
  onSubmit: () => void;
};

function parseTime(time: string): Date {
  const [h, m] = time.split(/[:h]/).map((x) => parseInt(x, 10));
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function DirectionsPlannerForm({
  origin,
  destination,
  date,
  time,
  stops,
  submitting,
  disabled,
  onOriginChange,
  onDestinationChange,
  onDateChange,
  onTimeChange,
  onSubmit,
}: Props) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const timeDate = parseTime(time);

  const swapStops = () => {
    onOriginChange(destination);
    onDestinationChange(origin);
  };

  const openDatePicker = () => {
    setShowTimePicker(false);
    setShowDatePicker((open) => !open);
  };

  const openTimePicker = () => {
    setShowDatePicker(false);
    setShowTimePicker((open) => !open);
  };

  const onTimePicked = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selected) {
      onTimeChange(formatTime(selected));
    }
  };

  const onDatePicked = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selected) {
      onDateChange(selected);
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    }
  };

  return (
    <View
      style={[
        styles.shell,
        { backgroundColor: theme.card, borderColor: theme.border },
        elevation(2, theme.text),
      ]}
    >
      <StopPicker
        placeholder={t('originPlaceholder')}
        value={origin}
        stops={stops}
        onSelect={onOriginChange}
        pinColor={theme.primary}
      />

      <View style={styles.swapRow}>
        <Pressable
          onPress={swapStops}
          style={[styles.swapBtn, { backgroundColor: theme.primary }]}
          accessibilityRole="button"
          accessibilityLabel={t('transitSwapStops')}
        >
          <ArrowUpDown size={16} color={theme.onPrimary} />
        </Pressable>
      </View>

      <StopPicker
        placeholder={t('destinationPlaceholder')}
        value={destination}
        stops={stops}
        onSelect={onDestinationChange}
        pinColor={theme.primary}
      />

      <View style={styles.dayTimeRow}>
        <Pressable
          onPress={openDatePicker}
          style={[
            styles.pillField,
            {
              borderColor: showDatePicker ? theme.primary : theme.border,
              backgroundColor: theme.surfaceVariant,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('dayLabel')}
        >
          <Calendar size={18} color={theme.muted} />
          <Text style={[typography.body, { color: theme.text, marginLeft: space.sm }]} numberOfLines={1}>
            {formatDateLabel(date, i18n.language)}
          </Text>
        </Pressable>

        <Pressable
          onPress={openTimePicker}
          style={[
            styles.pillField,
            {
              borderColor: showTimePicker ? theme.primary : theme.border,
              backgroundColor: theme.surfaceVariant,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('transitPickTime')}
        >
          <Clock size={18} color={theme.muted} />
          <Text style={[typography.body, { color: theme.text, marginLeft: space.sm }]}>{time}</Text>
        </Pressable>
      </View>

      {showDatePicker ? (
        <View style={styles.pickerWrap}>
          <ThemedDateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={onDatePicked}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              onPress={() => setShowDatePicker(false)}
              style={styles.pickerDone}
              accessibilityRole="button"
              accessibilityLabel={t('close')}
            >
              <Text style={[typography.label, { color: theme.primary }]}>{t('close')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showTimePicker ? (
        <View style={styles.pickerWrap}>
          <ThemedDateTimePicker
            value={timeDate}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimePicked}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              onPress={() => setShowTimePicker(false)}
              style={styles.pickerDone}
              accessibilityRole="button"
              accessibilityLabel={t('close')}
            >
              <Text style={[typography.label, { color: theme.primary }]}>{t('close')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Button
        label={t('directionsButton')}
        onPress={onSubmit}
        loading={submitting}
        disabled={disabled}
        fullWidth
        style={{ marginTop: space.md }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.md,
    width: '100%',
    overflow: 'hidden',
  },
  swapRow: { alignItems: 'flex-end', marginVertical: 2 },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTimeRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  pillField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    height: 44,
  },
  pickerWrap: { marginTop: space.sm },
  pickerDone: { alignSelf: 'flex-end', paddingVertical: space.sm, paddingHorizontal: space.xs },
});
