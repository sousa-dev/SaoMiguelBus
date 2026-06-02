import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useSubmitReview } from '@/features/marketplace/hooks/useMarketplaceQueries';
import type { AppTheme } from '@/lib/theme';

const STARS = [1, 2, 3, 4, 5];

export function ReviewSheet({
  visible,
  providerId,
  theme,
  onClose,
}: {
  visible: boolean;
  providerId: number;
  theme: AppTheme;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const mutation = useSubmitReview(providerId);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (rating < 1) {
      setError(t('marketplaceReviewError'));
      return;
    }
    setError(null);
    try {
      await mutation.mutateAsync({ rating, text: text.trim() });
      setRating(0);
      setText('');
      onClose();
    } catch {
      setError(t('marketplaceReviewError'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: theme.text }]}>{t('marketplaceReviewTitle')}</Text>
          <Text style={{ color: theme.muted, marginBottom: 12 }}>{t('marketplaceReviewHint')}</Text>
          <View style={styles.stars}>
            {STARS.map((value) => (
              <Pressable key={value} onPress={() => setRating(value)} style={styles.star}>
                <Text style={{ fontSize: 30, color: value <= rating ? theme.accent : theme.border }}>★</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('marketplaceReviewHint')}
            placeholderTextColor={theme.muted}
            multiline
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
          />
          {error ? <Text style={{ color: '#c0392b', marginTop: 8 }}>{error}</Text> : null}
          <Pressable
            onPress={() => void submit()}
            disabled={mutation.isPending}
            style={[styles.submit, { backgroundColor: theme.primary }]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>{t('marketplaceReviewSubmit')}</Text>
            )}
          </Pressable>
          <Pressable onPress={onClose} style={{ marginTop: 12 }}>
            <Text style={{ color: theme.muted, textAlign: 'center' }}>{t('marketplaceReviewCancel')}</Text>
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
  stars: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  star: { padding: 2 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 70, textAlignVertical: 'top' },
  submit: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  submitText: { color: '#fff', fontWeight: '700' },
});
