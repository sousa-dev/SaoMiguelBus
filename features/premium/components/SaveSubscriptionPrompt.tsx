import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import {
  dismissSaveSubscriptionPrompt,
  isSaveSubscriptionPromptVisible,
  subscribeSaveSubscriptionPrompt,
} from '@/features/premium/lib/save-subscription-prompt';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';
import { space, typography } from '@/lib/tokens';
import { StyleSheet, Text, View } from 'react-native';

/** Non-blocking prompt after an anonymous purchase — offers account sync. */
export function SaveSubscriptionPrompt() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [visible, setVisible] = useState(isSaveSubscriptionPromptVisible());

  useEffect(() => {
    return subscribeSaveSubscriptionPrompt(() => {
      setVisible(isSaveSubscriptionPromptVisible());
    });
  }, []);

  const onClose = () => {
    dismissSaveSubscriptionPrompt();
  };

  const onSave = () => {
    track('billing', 'save_subscription_prompt_click', { source: 'post_purchase' });
    dismissSaveSubscriptionPrompt();
    router.push('/auth/sign-in');
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('premiumSaveSubscriptionTitle')}>
      <View style={styles.content}>
        <Text style={[typography.body, { color: theme.text }]}>{t('premiumSaveSubscriptionBody')}</Text>
        <Button
          label={t('premiumSaveSubscriptionPrimary')}
          onPress={onSave}
          fullWidth
          style={styles.primary}
        />
        <Button label={t('premiumSaveSubscriptionSecondary')} variant="ghost" onPress={onClose} fullWidth />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, gap: space.sm },
  primary: { marginTop: space.lg },
});
