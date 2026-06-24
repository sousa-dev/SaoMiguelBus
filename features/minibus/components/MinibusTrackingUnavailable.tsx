import { Radio, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type MinibusTrackingUnavailableUpstreamProps = {
  variant?: 'upstream';
  onTryAgain: () => void;
  tryAgainDisabled: boolean;
  tryAgainLabel: string;
  loading?: boolean;
};

type MinibusTrackingUnavailableOfflineProps = {
  variant: 'offline';
};

export type MinibusTrackingUnavailableProps =
  | MinibusTrackingUnavailableUpstreamProps
  | MinibusTrackingUnavailableOfflineProps;

export function MinibusTrackingUnavailable(props: MinibusTrackingUnavailableProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isOffline = props.variant === 'offline';

  return (
    <View style={styles.wrap}>
      {isOffline ? (
        <WifiOff size={40} color={theme.muted} strokeWidth={1.5} />
      ) : (
        <Radio size={40} color={theme.muted} strokeWidth={1.5} />
      )}
      <Text style={[typography.headline, styles.title, { color: theme.text }]}>
        {t(isOffline ? 'minibusLiveOffline' : 'minibusLiveUnavailable')}
      </Text>
      <Text style={[typography.body, styles.hint, { color: theme.muted }]}>
        {t(isOffline ? 'minibusLiveOfflineHint' : 'minibusLiveUnavailableHint')}
      </Text>
      {!isOffline ? (
        <Button
          label={props.tryAgainLabel}
          variant="outline"
          onPress={props.onTryAgain}
          disabled={props.tryAgainDisabled}
          loading={props.loading}
          style={styles.button}
        />
      ) : null}
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
