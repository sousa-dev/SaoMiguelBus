import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Sheet } from '@/components/ui/Sheet';
import { useSubmitFeltReport } from '@/features/earthquakes/hooks/useEarthquakeQueries';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { SeismicEvent, SeismicFeltInput } from '@/lib/types';

const INTENSITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

type Stage = 'binary' | 'intensity';

export function FeltVoteSheet({
  visible,
  eventId,
  event,
  onClose,
}: {
  visible: boolean;
  eventId: number;
  event?: SeismicEvent | null;
  onClose: () => void;
}) {
  const theme = useAppTheme();
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

  return (
    <Sheet visible={visible} onClose={onClose} title={stage === 'binary' ? t('seismicFeltQuestion') : t('seismicFeltTitle')}>
      <View style={{ paddingHorizontal: space.lg }}>
        {event ? (
          <View style={{ marginBottom: space.md }}>
            <Text style={[typography.display, { color: theme.primary, fontSize: 24 }]}>M{event.magnitude.toFixed(1)}</Text>
            <Text style={[typography.bodyStrong, { color: theme.text }]} numberOfLines={2}>
              {event.region || '—'}
            </Text>
          </View>
        ) : null}

        {stage === 'binary' ? (
          <View style={styles.binaryRow}>
            <Button label={t('seismicFeltNo')} variant="outline" onPress={() => void submit({ felt: false })} disabled={mutation.isPending} style={{ flex: 1 }} />
            <Button label={t('seismicFeltYes')} onPress={() => setStage('intensity')} disabled={mutation.isPending} style={{ flex: 1 }} />
          </View>
        ) : (
          <>
            <Text style={[typography.body, { color: theme.muted, marginBottom: space.md }]}>
              {t('seismicFeltIntensityOptional')}
            </Text>
            <View style={styles.grid}>
              {INTENSITIES.map((value) => (
                <Chip
                  key={value}
                  label={String(value)}
                  onPress={() => void submit({ felt: true, intensity: value })}
                  disabled={mutation.isPending}
                />
              ))}
            </View>
            <Button label={t('seismicFeltSkip')} variant="outline" onPress={() => void submit({ felt: true, intensity: null })} fullWidth style={{ marginTop: space.md }} />
            <Button label={t('seismicFeltBack')} variant="ghost" onPress={() => setStage('binary')} fullWidth style={{ marginTop: space.sm }} />
          </>
        )}

        {mutation.isPending ? <ActivityIndicator color={theme.primary} style={{ marginTop: space.md }} /> : null}
        {error ? <Text style={[typography.caption, { color: theme.danger, marginTop: space.sm }]}>{error}</Text> : null}
        <Button label={t('seismicFeltCancel')} variant="ghost" onPress={onClose} fullWidth style={{ marginTop: space.lg }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  binaryRow: { flexDirection: 'row', gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
