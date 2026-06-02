import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useSubmitFeltReport } from '@/features/earthquakes/hooks/useEarthquakeQueries';
import type { AppTheme } from '@/lib/theme';

const INTENSITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function FeltReportSheet({
  visible,
  eventId,
  theme,
  onClose,
}: {
  visible: boolean;
  eventId: number;
  theme: AppTheme;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const mutation = useSubmitFeltReport(eventId);
  const [error, setError] = useState<string | null>(null);

  const submit = async (intensity: number) => {
    setError(null);
    try {
      await mutation.mutateAsync(intensity);
      onClose();
    } catch {
      setError(t('seismicFeltError'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: theme.text }]}>{t('seismicFeltTitle')}</Text>
          <Text style={{ color: theme.muted, marginBottom: 12 }}>{t('seismicFeltHint')}</Text>
          <View style={styles.grid}>
            {INTENSITIES.map((value) => (
              <Pressable
                key={value}
                disabled={mutation.isPending}
                onPress={() => void submit(value)}
                style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.background }]}
              >
                <Text style={{ color: theme.text, fontWeight: '700' }}>{value}</Text>
              </Pressable>
            ))}
          </View>
          {mutation.isPending ? <ActivityIndicator color={theme.primary} style={{ marginTop: 12 }} /> : null}
          {error ? <Text style={{ color: '#c0392b', marginTop: 10 }}>{error}</Text> : null}
          <Pressable onPress={onClose} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.muted, textAlign: 'center' }}>{t('seismicFeltCancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
