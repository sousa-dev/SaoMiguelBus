import React, { useState } from 'react';
import { Star } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { useSubmitReview } from '@/features/marketplace/hooks/useMarketplaceQueries';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const STARS = [1, 2, 3, 4, 5];

export function ReviewSheet({
  visible,
  providerId,
  onClose,
}: {
  visible: boolean;
  providerId: number;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const mutation = useSubmitReview(providerId);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      await mutation.mutateAsync({ rating, text: text.trim() || undefined });
      onClose();
      setText('');
      setRating(5);
    } catch {
      setError(t('marketplaceReviewError'));
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('marketplaceReviewTitle')}>
      <View style={{ paddingHorizontal: space.lg }}>
        <View style={styles.stars}>
          {STARS.map((star) => (
            <Pressable key={star} onPress={() => setRating(star)} accessibilityLabel={`${star} stars`}>
              <Star
                size={32}
                color={star <= rating ? theme.accent : theme.muted}
                fill={star <= rating ? theme.accent : 'transparent'}
                strokeWidth={2}
              />
            </Pressable>
          ))}
        </View>
        <Field
          value={text}
          onChangeText={setText}
          placeholder={t('marketplaceReviewPlaceholder')}
          multiline
          numberOfLines={4}
        />
        {error ? <Text style={[typography.caption, { color: theme.danger }]}>{error}</Text> : null}
        <Button label={t('marketplaceReviewSubmit')} onPress={() => void submit()} loading={mutation.isPending} fullWidth />
        <Button label={t('marketplaceReviewCancel')} variant="ghost" onPress={onClose} fullWidth style={{ marginTop: space.sm }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
});
