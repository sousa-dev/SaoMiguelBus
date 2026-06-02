import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import type { AppTheme } from '@/lib/theme';
import type { TrafficCategory } from '@/lib/types';

/**
 * One-tap category grid for fast reporting while driving. Tapping a category
 * immediately creates a report at the current location — no further input.
 * Schedulable categories can route to the detailed form via `onAddDetails`.
 */
export function CategoryPickerSheet({
  visible,
  categories,
  theme,
  pending,
  onPick,
  onAddDetails,
  onPickOnMap,
  onClose,
}: {
  visible: boolean;
  categories: TrafficCategory[];
  theme: AppTheme;
  pending: boolean;
  onPick: (category: TrafficCategory) => void;
  onAddDetails: () => void;
  onPickOnMap: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: theme.text }]}>{t('trafficReportTitle')}</Text>
          <Text style={{ color: theme.muted, marginBottom: 14 }}>{t('trafficReportHint')}</Text>

          <View style={styles.grid}>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                disabled={pending}
                onPress={() => onPick(category)}
                style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.background }]}
              >
                <Text style={styles.chipIcon}>{category.icon || '⚠️'}</Text>
                <Text style={[styles.chipLabel, { color: theme.text }]} numberOfLines={1}>
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </View>

          {pending ? <ActivityIndicator color={theme.primary} style={{ marginTop: 12 }} /> : null}

          <Pressable onPress={onPickOnMap} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.primary, textAlign: 'center', fontWeight: '600' }}>
              {t('trafficPickOnMap')}
            </Text>
          </Pressable>

          <Pressable onPress={onAddDetails} style={{ marginTop: 12 }}>
            <Text style={{ color: theme.muted, textAlign: 'center', fontWeight: '600' }}>
              {t('trafficAddDetails')}
            </Text>
          </Pressable>
          <Pressable onPress={onClose} style={{ marginTop: 12 }}>
            <Text style={{ color: theme.muted, textAlign: 'center' }}>{t('trafficCancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    width: 92,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  chipIcon: { fontSize: 26, marginBottom: 6 },
  chipLabel: { fontSize: 12, fontWeight: '600' },
});
