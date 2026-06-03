import RNDateTimePicker from '@react-native-community/datetimepicker';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

import { useAppTheme } from '@/lib/theme';

type Props = ComponentProps<typeof RNDateTimePicker>;

/** Date/time picker wired to app theme (not just OS appearance). */
export function ThemedDateTimePicker(props: Props) {
  const theme = useAppTheme();

  const iosTheme =
    Platform.OS === 'ios'
      ? {
          themeVariant: (theme.isDark ? 'dark' : 'light') as 'dark' | 'light',
          accentColor: theme.primary,
          ...(props.display === 'spinner' ? { textColor: theme.text } : {}),
        }
      : {};

  return <RNDateTimePicker {...props} {...iosTheme} />;
}
