import { useLocalSearchParams, useRouter } from 'expo-router';
import { Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/StateView';
import { Field } from '@/components/ui/Field';
import {
  useMarketplaceAdminReviews,
  useUpdateMarketplaceReviewAdmin,
} from '@/features/marketplace/hooks/useMarketplaceAdminQueries';
import { notify } from '@/lib/confirm';
import { useAppTheme } from '@/lib/theme';
import { iconSize, space, typography } from '@/lib/tokens';

export default function AdminReviewEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewId = Number(id);
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const reviews = useMarketplaceAdminReviews();
  const update = useUpdateMarketplaceReviewAdmin(reviewId);
  const review = reviews.data?.reviews.find((r) => r.id === reviewId);

  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!review) {
      return;
    }
    setRating(review.rating);
    setText(review.text);
  }, [review]);

  if (reviews.isLoading) {
    return <LoadingState title={t('marketplaceAdminLoading')} />;
  }

  if (!review) {
    return (
      <ErrorState
        title={t('marketplaceAdminReviewNotFound')}
        actionLabel={t('commonRetry')}
        onAction={() => void reviews.refetch()}
      />
    );
  }

  const currentRating = rating ?? review.rating;

  const save = () => {
    setError(null);
    update.mutate(
      { rating: currentRating, text: text.trim() },
      {
        onSuccess: () => {
          notify(t('marketplaceAdminSavedTitle'), t('marketplaceAdminSavedMessage'));
          router.back();
        },
        onError: () => setError(t('marketplaceAdminSaveError')),
      },
    );
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {error ? <Banner variant="danger" message={error} /> : null}
      <Card elevated>
        <Text style={[typography.overline, { color: theme.muted, marginBottom: space.sm }]}>
          {review.providerName}
        </Text>
        <Text style={[typography.caption, { color: theme.muted, marginBottom: space.md }]}>
          {t('marketplaceAdminReviewStatus', {
            status: t(`marketplaceAdminStatus_${review.status}`, { defaultValue: review.status }),
          })}
        </Text>
        <Text style={[typography.bodyStrong, { color: theme.text, marginBottom: space.sm }]}>
          {t('marketplaceAdminReviewRating')}
        </Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable key={value} onPress={() => setRating(value)} accessibilityRole="button">
              <Star
                size={iconSize.lg}
                color={value <= currentRating ? theme.warning : theme.outline}
                fill={value <= currentRating ? theme.warning : 'transparent'}
              />
            </Pressable>
          ))}
        </View>
        <Field
          label={t('marketplaceAdminReviewText')}
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={4}
        />
      </Card>
      <Button label={t('marketplaceAdminSave')} onPress={save} loading={update.isPending} fullWidth />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space['4xl'] },
  stars: { flexDirection: 'row', gap: space.sm, marginBottom: space.lg },
});
