import { Radio } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type MinibusTrackingUnavailableProps = {
  onTryAgain: () => void;
  tryAgainDisabled: boolean;
  tryAgainLabel: string;
  loading?: boolean;
};

export function MinibusTrackingUnavailable({
  onTryAgain,
  tryAgainDisabled,
  tryAgainLabel,
  loading = false,
}: MinibusTrackingUnavailableProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Radio size={40} color={theme.muted} strokeWidth={1.5} />
      <Text style={[typography.headline, styles.title, { color: theme.text }]}>
        {t('minibusLiveUnavailable')}
      </Text>
      <Text style={[typography.body, styles.hint, { color: theme.muted }]}>
        {t('minibusLiveUnavailableHint')}
      </Text>
      <Button
        label={tryAgainLabel}
        variant="outline"
        onPress={onTryAgain}
        disabled={tryAgainDisabled}
        loading={loading}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space['2xl'],
  },
  title: {
    textAlign: 'center',
    marginTop: space.md,
  },
  hint: {
    textAlign: 'center',
    marginTop: space.sm,
  },
  button: {
    marginTop: space.lg,
  },
});
