import React from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';

import { localeToFlagEmoji } from '@/lib/locale-region';

type LocaleFlagProps = {
  locale: string;
  size?: number;
  style?: TextStyle;
  accessibilityLabel?: string;
};

/** Country flag emoji derived from locale → ISO region mapping. */
export function LocaleFlag({ locale, size = 24, style, accessibilityLabel }: LocaleFlagProps) {
  const flag = localeToFlagEmoji(locale);

  return (
    <Text
      accessibilityLabel={accessibilityLabel}
      style={[styles.flag, { fontSize: size, lineHeight: size * 1.15 }, style]}
    >
      {flag}
    </Text>
  );
}

const styles = StyleSheet.create({
  flag: { textAlign: 'center' },
});
