import React, { useEffect, useRef } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { useAppUpdateCheck } from '@/features/app-update/hooks/useAppUpdateCheck';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';
import { space, typography } from '@/lib/tokens';

/** Optional alert or required blocking sheet when the native build is behind the API release. */
export function AppUpdatePrompt() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { shouldShow, updateMode, currentVersion, dismiss, openStore } = useAppUpdateCheck();
  const optionalShownRef = useRef(false);
  const trackedVersionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldShow) {
      optionalShownRef.current = false;
      return;
    }
    if (updateMode !== 'optional' || optionalShownRef.current) {
      return;
    }
    optionalShownRef.current = true;
    if (trackedVersionRef.current !== currentVersion) {
      trackedVersionRef.current = currentVersion;
      track('app', 'update_prompt_shown', { mode: updateMode, currentVersion });
    }
    Alert.alert(
      t('appUpdateOptionalTitle'),
      t('appUpdateOptionalBody', { version: currentVersion ?? '' }),
      [
        {
          text: t('appUpdateLater'),
          style: 'cancel',
          onPress: () => {
            void dismiss();
          },
        },
        {
          text: t('appUpdateConfirm'),
          onPress: () => {
            track('app', 'update_prompt_click', { mode: updateMode, currentVersion });
            void openStore();
          },
        },
      ],
    );
  }, [shouldShow, updateMode, currentVersion, dismiss, openStore, t]);

  useEffect(() => {
    if (!shouldShow || updateMode !== 'required') {
      return;
    }
    if (trackedVersionRef.current !== currentVersion) {
      trackedVersionRef.current = currentVersion;
      track('app', 'update_prompt_shown', { mode: updateMode, currentVersion });
    }
  }, [shouldShow, updateMode, currentVersion]);

  const requiredVisible = shouldShow && updateMode === 'required';

  return (
    <Sheet
      visible={requiredVisible}
      onClose={() => {}}
      dismissable={false}
      title={t('appUpdateRequiredTitle')}
      scrollable={false}
    >
      <View style={styles.content}>
        <Text style={[typography.body, { color: theme.text }]}>
          {t('appUpdateRequiredBody', { version: currentVersion ?? '' })}
        </Text>
        <Button
          label={t('appUpdateConfirm')}
          onPress={() => {
            track('app', 'update_prompt_click', { mode: updateMode, currentVersion });
            void openStore();
          }}
          fullWidth
          style={styles.primary}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, gap: space.sm },
  primary: { marginTop: space.lg },
});
