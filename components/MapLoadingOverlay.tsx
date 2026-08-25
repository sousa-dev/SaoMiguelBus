import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
};

export function MapLoadingOverlay({ visible }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      accessibilityRole="progressbar"
      accessibilityLabel={t('mapLoading')}
      style={[styles.overlay, { backgroundColor: theme.surface }]}
    >
      <ActivityIndicator color={theme.primary} />
      <Text style={[typography.caption, styles.label, { color: theme.muted }]}>{t('mapLoading')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  label: {
    textAlign: 'center',
  },
});
