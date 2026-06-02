import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowRightLeft, Calendar, Clock, Route, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { StopPicker } from '@/features/transit/components/StopPicker';
import { formatDateLabel } from '@/lib/transit-format';
import { elevation, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { Stop } from '@/lib/types';

type TransitPlannerCardProps = {
  origin: string;
  destination: string;
  date: Date;
  time: string;
  stops: Stop[];
  isOnline: boolean;
  searching?: boolean;
  onOriginChange: (v: string) => void;
  onDestinationChange: (v: string) => void;
  onDateChange: (d: Date) => void;
  onTimeChange: (t: string) => void;
  onSearch: () => void;
  onDirections: () => void;
};

function parseTime(time: string): Date {
  const [h, m] = time.split(':').map((x) => parseInt(x, 10));
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function TransitPlannerCard({
  origin,
  destination,
  date,
  time,
  stops,
  isOnline,
  searching,
  onOriginChange,
  onDestinationChange,
  onDateChange,
  onTimeChange,
  onSearch,
  onDirections,
}: TransitPlannerCardProps) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const timeDate = parseTime(time);
  const canDirections = isOnline && Boolean(origin && destination);

  const swapStops = () => {
    onOriginChange(destination);
    onDestinationChange(origin);
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
          <ArrowRightLeft size={16} color={theme.onPrimary} style={{ transform: [{ rotate: '90deg' }] }} />
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
          onPress={() => setShowDatePicker(true)}
          style={[styles.pillField, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
          accessibilityRole="button"
          accessibilityLabel={t('dayLabel')}
        >
          <Calendar size={18} color={theme.muted} />
          <Text style={[typography.body, { color: theme.text, marginLeft: space.sm }]} numberOfLines={1}>
            {formatDateLabel(date, i18n.language)}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setShowTimePicker(true)}
          style={[styles.pillField, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
          accessibilityRole="button"
          accessibilityLabel={t('transitPickTime')}
        >
          <Clock size={18} color={theme.muted} />
          <Text style={[typography.body, { color: theme.text, marginLeft: space.sm }]}>{time}</Text>
        </Pressable>
      </View>

      {showDatePicker ? (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onDatePicked}
        />
      ) : null}

      {showTimePicker ? (
        <DateTimePicker
          value={timeDate}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimePicked}
        />
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={onSearch}
          disabled={!isOnline || searching}
          style={({ pressed }) => [
            styles.searchBtn,
            { backgroundColor: theme.primary, opacity: !isOnline || searching ? 0.5 : pressed ? 0.9 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('searchButton')}
        >
          {searching ? (
            <ActivityIndicator color={theme.onPrimary} />
          ) : (
            <>
              <Search size={18} color={theme.onPrimary} />
              <Text style={[typography.label, { color: theme.onPrimary, marginLeft: space.sm }]}>
                {t('searchButton')}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={onDirections}
          disabled={!canDirections}
          style={({ pressed }) => [
            styles.routeBtn,
            { backgroundColor: theme.primary, opacity: !canDirections ? 0.5 : pressed ? 0.9 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('directionsButton')}
        >
          <Route size={20} color={theme.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.md,
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
  dayTimeRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.md,
  },
  pillField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    height: 44,
  },
  actions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.md,
  },
  searchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    height: 44,
  },
  routeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
