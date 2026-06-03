import React, { type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type FieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  trailing?: ReactNode;
};

export function Field({ label, hint, error, trailing, style, ...inputProps }: FieldProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[typography.label, { color: theme.text, marginBottom: space.xs }]}>{label}</Text> : null}
      <View style={[styles.row, { borderColor: error ? theme.danger : theme.border, backgroundColor: theme.card }]}>
        <TextInput
          placeholderTextColor={theme.muted}
          style={[styles.input, typography.body, { color: theme.text }, style]}
          {...inputProps}
        />
        {trailing}
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
