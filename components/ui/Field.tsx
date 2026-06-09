import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type FieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  trailing?: ReactNode;
};

export function Field({
  label,
  hint,
  error,
  trailing,
  style,
  secureTextEntry,
  ...inputProps
}: FieldProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPasswordField = secureTextEntry === true;
  const resolvedSecureEntry = isPasswordField ? !passwordVisible : secureTextEntry;
  const passwordToggle =
    isPasswordField && !trailing ? (
      <IconButton
        icon={passwordVisible ? EyeOff : Eye}
        size="sm"
        color={theme.muted}
        accessibilityLabel={passwordVisible ? t('authHidePassword') : t('authShowPassword')}
        onPress={() => setPasswordVisible((visible) => !visible)}
      />
    ) : null;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[typography.label, { color: theme.text, marginBottom: space.xs }]}>{label}</Text> : null}
      <View style={[styles.row, { borderColor: error ? theme.danger : theme.border, backgroundColor: theme.card }]}>
        <TextInput
          placeholderTextColor={theme.muted}
          style={[styles.input, typography.body, { color: theme.text }, style]}
          secureTextEntry={resolvedSecureEntry}
          {...inputProps}
        />
        {trailing ?? passwordToggle}
      </View>
      {error ? (
        <Text style={[typography.caption, { color: theme.danger, marginTop: space.xs }]}>{error}</Text>
      ) : hint ? (
        <Text style={[typography.caption, { color: theme.muted, marginTop: space.xs }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: 48,
  },
  input: { flex: 1, paddingVertical: space.sm },
});
