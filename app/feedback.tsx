import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bug, Lightbulb, MessageCircle, Sparkles, X } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenshotPicker } from '@/features/feedback/components/ScreenshotPicker';
import {
  composeFeedbackEmail,
  type ComposeResult,
  type FeedbackCategory,
} from '@/lib/feedback-mail';
import i18n from '@/lib/i18n';
import { getAnalyticsPlatform, getAppVersion } from '@/lib/platform';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const CATEGORIES: { value: FeedbackCategory; labelKey: string; icon: LucideIcon }[] = [
  { value: 'bug', labelKey: 'feedbackCategoryBug', icon: Bug },
  { value: 'feature', labelKey: 'feedbackCategoryFeature', icon: Lightbulb },
  { value: 'suggestion', labelKey: 'feedbackCategorySuggestion', icon: Sparkles },
  { value: 'feedback', labelKey: 'feedbackCategoryFeedback', icon: MessageCircle },
];

const PRESET_SUBJECT_KEY: Record<string, string> = {
  newsSource: 'feedbackPresetNewsSource',
  trail: 'feedbackPresetTrail',
};

function isCategory(value: string | undefined): value is FeedbackCategory {
  return value === 'bug' || value === 'feature' || value === 'suggestion' || value === 'feedback';
}

export default function FeedbackScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    from?: string;
    label?: string;
    category?: string;
    preset?: string;
  }>();

  const presetSubject = params.preset && PRESET_SUBJECT_KEY[params.preset]
    ? t(PRESET_SUBJECT_KEY[params.preset])
    : '';

  const [subject, setSubject] = useState(presetSubject);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>(
    isCategory(params.category) ? params.category : 'bug',
  );
  const [replyEmail, setReplyEmail] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ variant: 'warning' | 'danger'; message: string } | null>(
    null,
  );

  const context = useMemo(
    () => ({
      from: params.from ?? '',
      label: params.label ?? '',
      appVersion: getAppVersion(),
      platform: getAnalyticsPlatform(),
      locale: i18n.language,
    }),
    [params.from, params.label],
  );

  const canSubmit = subject.trim().length > 0 && description.trim().length > 0 && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setNotice(null);
    let result: ComposeResult;
    try {
      result = await composeFeedbackEmail({
        category,
        subject: subject.trim(),
        description: description.trim(),
        context,
        replyEmail: replyEmail.trim() || undefined,
        attachments: screenshots,
      });
    } catch {
      setSubmitting(false);
      setNotice({ variant: 'danger', message: t('feedbackError') });
      return;
    }
    setSubmitting(false);

    if (result === 'unavailable') {
      setNotice({ variant: 'danger', message: t('feedbackMailUnavailable') });
      return;
    }
    if (result === 'fallback' && screenshots.length > 0) {
      setNotice({ variant: 'warning', message: t('feedbackMailFallbackNoAttachments') });
      return;
    }
    router.back();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[typography.title, { color: theme.text }]}>{t('feedbackTitle')}</Text>
        <IconButton
          icon={X}
          variant="ghost"
          color={theme.muted}
          accessibilityLabel={t('fabClose')}
          onPress={() => router.back()}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {notice ? <Banner variant={notice.variant} message={notice.message} /> : null}

          <Card elevated>
            <Text style={[typography.overline, { color: theme.muted, marginBottom: space.md }]}>
              {t('feedbackCategoryLabel')}
            </Text>
            <View style={styles.grid}>
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = c.value === category;
                return (
                  <Pressable
                    key={c.value}
                    onPress={() => setCategory(c.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t(c.labelKey)}
                    style={[
                      styles.categoryTile,
                      {
                        borderColor: active ? theme.primary : theme.border,
                        backgroundColor: active ? theme.primary : theme.card,
                      },
                    ]}
                  >
                    <Icon size={22} color={active ? theme.onPrimary : theme.primary} strokeWidth={2} />
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: active ? theme.onPrimary : theme.text,
                          marginTop: 4,
                          textAlign: 'center',
                        },
                      ]}
                    >
                      {t(c.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Card elevated style={styles.section}>
            <Field
              label={t('feedbackSubjectLabel')}
              value={subject}
              onChangeText={setSubject}
              placeholder={t('feedbackSubjectPlaceholder')}
            />
            <Field
              label={t('feedbackDescriptionLabel')}
              value={description}
              onChangeText={setDescription}
              placeholder={t('feedbackDescriptionPlaceholder')}
              multiline
              numberOfLines={5}
            />
            <Field
              label={t('feedbackReplyEmailLabel')}
              value={replyEmail}
              onChangeText={setReplyEmail}
              placeholder={t('feedbackReplyEmailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Card>

          <Card elevated style={styles.section}>
            <ScreenshotPicker uris={screenshots} onChange={setScreenshots} />
          </Card>

          <Card elevated style={styles.section}>
            <Text style={[typography.overline, { color: theme.muted, marginBottom: space.sm }]}>
              {t('feedbackIncludedInfoLabel')}
            </Text>
            {context.label ? (
              <Text style={[typography.caption, { color: theme.muted }]}>
                {t('feedbackContextScreen', { screen: context.label })}
              </Text>
            ) : null}
            <Text style={[typography.caption, { color: theme.muted }]}>
              {t('feedbackContextVersion', { version: context.appVersion })}
            </Text>
            <Text style={[typography.caption, { color: theme.muted }]}>
              {t('feedbackContextPlatform', { platform: context.platform })}
            </Text>
            <Text style={[typography.caption, { color: theme.muted }]}>
              {t('feedbackContextLanguage', { language: context.locale })}
            </Text>
          </Card>

          <Button
            label={submitting ? t('feedbackSubmitting') : t('feedbackSubmit')}
            onPress={() => void onSubmit()}
            disabled={!canSubmit}
            loading={submitting}
            fullWidth
            style={{ marginTop: space.lg }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  content: { padding: space.lg, paddingBottom: space['4xl'] },
  section: { marginTop: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  categoryTile: {
    width: 88,
    paddingVertical: space.md,
    paddingHorizontal: space.xs,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
});
