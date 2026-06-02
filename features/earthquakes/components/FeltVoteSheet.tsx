import React, { useEffect, useState } from 'react';
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
import type { SeismicEvent, SeismicFeltInput } from '@/lib/types';

const INTENSITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

type Stage = 'binary' | 'intensity';

export function FeltVoteSheet({
  visible,
  eventId,
  event,
  theme,
  onClose,
}: {
  visible: boolean;
  eventId: number;
  event?: SeismicEvent | null;
  theme: AppTheme;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const mutation = useSubmitFeltReport(eventId);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('binary');

  useEffect(() => {
    if (visible) {
      setStage('binary');
      setError(null);
    }
  }, [visible, eventId]);

  const submit = async (input: SeismicFeltInput) => {
    if (eventId <= 0) {
      return;
    }
    setError(null);
    try {
      await mutation.mutateAsync(input);
      onClose();
    } catch {
      setError(t('seismicFeltError'));
    }
  };

  const onNo = () => void submit({ felt: false });
  const onYes = () => setStage('intensity');
  const onSkipIntensity = () => void submit({ felt: true, intensity: null });
  const onIntensity = (intensity: number) => void submit({ felt: true, intensity });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          {event ? (
            <View style={styles.eventHeader}>
              <Text style={[styles.eventMag, { color: theme.primary }]}>
                M{event.magnitude.toFixed(1)}
              </Text>
              <Text style={[styles.eventRegion, { color: theme.text }]} numberOfLines={2}>
                {event.region || '—'}
              </Text>
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>
                {new Date(event.occurredAt).toLocaleString()}
              </Text>
            </View>
          ) : null}

          {stage === 'binary' ? (
            <>
              <Text style={[styles.title, { color: theme.text }]}>{t('seismicFeltQuestion')}</Text>
              <View style={styles.binaryRow}>
                <Pressable
                  disabled={mutation.isPending}
                  onPress={onNo}
                  style={[styles.binaryBtn, { borderColor: theme.border }]}
                >
                  <Text style={{ color: theme.text, fontWeight: '700' }}>{t('seismicFeltNo')}</Text>
                </Pressable>
                <Pressable
                  disabled={mutation.isPending}
                  onPress={onYes}
                  style={[styles.binaryBtn, { backgroundColor: theme.primary }]}
                >
                  <Text style={styles.binaryBtnText}>{t('seismicFeltYes')}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: theme.text }]}>{t('seismicFeltTitle')}</Text>
              <Text style={{ color: theme.muted, marginBottom: 12 }}>
                {t('seismicFeltIntensityOptional')}
              </Text>
              <View style={styles.grid}>
                {INTENSITIES.map((value) => (
                  <Pressable
                    key={value}
                    disabled={mutation.isPending}
                    onPress={() => void onIntensity(value)}
                    style={[
                      styles.chip,
                      { borderColor: theme.border, backgroundColor: theme.background },
                    ]}
                  >
                    <Text style={{ color: theme.text, fontWeight: '700' }}>{value}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                disabled={mutation.isPending}
                onPress={onSkipIntensity}
                style={[styles.skipBtn, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.text, fontWeight: '600' }}>{t('seismicFeltSkip')}</Text>
              </Pressable>
              <Pressable onPress={() => setStage('binary')} style={{ marginTop: 8 }}>
                <Text style={{ color: theme.muted, textAlign: 'center', fontSize: 13 }}>
                  {t('seismicFeltBack')}
                </Text>
              </Pressable>
            </>
          )}

          {mutation.isPending ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 12 }} />
          ) : null}
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
  eventHeader: { marginBottom: 14 },
  eventMag: { fontSize: 24, fontWeight: '800' },
  eventRegion: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  binaryRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  binaryBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 14,
    borderWidth: 1,
  },
  binaryBtnText: { color: '#fff', fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
