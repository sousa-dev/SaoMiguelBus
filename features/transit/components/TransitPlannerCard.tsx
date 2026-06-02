import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowRightLeft, Clock, MapPin } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { FavoriteToggle } from '@/features/transit/components/FavoriteToggle';
import { StopPicker } from '@/features/transit/components/StopPicker';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { Stop } from '@/lib/types';

type DayType = 'weekday' | 'saturday' | 'sunday';

type TransitPlannerCardProps = {
  origin: string;
  destination: string;
  day: DayType;
  time: string;
  stops: Stop[];
  isOnline: boolean;
  onOriginChange: (v: string) => void;
  onDestinationChange: (v: string) => void;
  onDayChange: (d: DayType) => void;
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
  day,
  time,
  stops,
  isOnline,
  onOriginChange,
  onDestinationChange,
  onDayChange,
  onTimeChange,
  onSearch,
  onDirections,
}: TransitPlannerCardProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const timeDate = parseTime(time);

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

  return (
    <Card elevated style={styles.card}>
      <View style={styles.stopRow}>
        <MapPin size={18} color={theme.primary} style={styles.pinIcon} />
        <View style={styles.stopFields}>
          <StopPicker
            label={t('originLabel')}
            placeholder={t('originPlaceholder')}
            value={origin}
            stops={stops}
            onSelect={onOriginChange}
          />
        </View>
      </View>

      <View style={styles.swapRow}>
        <IconButton
          icon={ArrowRightLeft}
          accessibilityLabel={t('transitSwapStops')}
          color={theme.primary}
          onPress={swapStops}
        />
      </View>

      <View style={styles.stopRow}>
        <MapPin size={18} color={theme.accent} style={styles.pinIcon} />
        <View style={styles.stopFields}>
          <StopPicker
            label={t('destinationLabel')}
            placeholder={t('destinationPlaceholder')}
            value={destination}
            stops={stops}
            onSelect={onDestinationChange}
          />
        </View>
      </View>

      <FavoriteToggle origin={origin} destination={destination} />

      <Text style={[typography.label, { color: theme.text, marginTop: space.md }]}>{t('dayLabel')}</Text>
      <View style={styles.dayRow}>
        {(['weekday', 'saturday', 'sunday'] as DayType[]).map((d) => (
          <Chip key={d} label={t(d)} selected={day === d} onPress={() => onDayChange(d)} />
        ))}
      </View>

      <Text style={[typography.label, { color: theme.text, marginTop: space.md }]}>{t('timeLabel')}</Text>
      <Pressable
        onPress={() => setShowTimePicker(true)}
        style={[styles.timeField, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
        accessibilityRole="button"
        accessibilityLabel={t('transitPickTime')}
      >
        <Clock size={18} color={theme.muted} />
        <Text style={[typography.body, { color: theme.text, marginLeft: space.sm }]}>{time}</Text>
      </Pressable>

      {showTimePicker ? (
        <DateTimePicker
          value={timeDate}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimePicked}
        />
      ) : null}

      <Button
        label={t('searchButton')}
        onPress={onSearch}
        disabled={!isOnline}
        fullWidth
        style={{ marginTop: space.lg }}
      />
      <Button
        label={t('directionsButton')}
        variant="outline"
        onPress={onDirections}
        disabled={!isOnline || !origin || !destination}
        fullWidth
        style={{ marginTop: space.sm }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.lg },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  pinIcon: { marginTop: space['2xl'] },
  stopFields: { flex: 1 },
  swapRow: { alignItems: 'center', marginVertical: space.xs },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm },
  timeField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: space.md,
    marginTop: space.sm,
  },
});
