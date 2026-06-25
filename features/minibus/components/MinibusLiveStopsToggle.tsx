import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { radius, space, typography, elevation } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  showStops: boolean;
  onShowStopsChange: (showStops: boolean) => void;
};

export function MinibusLiveStopsToggle({ showStops, onShowStopsChange }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: showStops }}
      accessibilityLabel={t('minibusLiveShowStops')}
      onPress={() => onShowStopsChange(!showStops)}
      style={({ pressed }) => [
        styles.chip,
        elevation(3, '#000'),
        { backgroundColor: theme.surface },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: showStops ? theme.primary : theme.outline,
            backgroundColor: showStops ? theme.primary : theme.surface,
          },
        ]}
      >
        {showStops ? <Check size={14} color={theme.onPrimary} strokeWidth={3} /> : null}
      </View>
      <Text style={[typography.caption, { color: theme.text }]}>{t('minibusLiveShowStops')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.md,
  },
  pressed: {
    opacity: 0.75,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
