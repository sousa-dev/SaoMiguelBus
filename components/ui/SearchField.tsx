import { Search, X } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/ui/IconButton';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  onClear?: () => void;
};

export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  onClear,
}: SearchFieldProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.wrap, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
      <Search size={iconSize.md} color={theme.muted} strokeWidth={2} />
      <TextInput
        accessibilityLabel={accessibilityLabel ?? placeholder}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, typography.body, { color: theme.text }]}
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 ? (
        <IconButton
          icon={X}
          variant="ghost"
          size="sm"
          color={theme.muted}
          accessibilityLabel={t('clearInput')}
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    gap: space.sm,
    minHeight: 48,
  },
  input: { flex: 1, paddingVertical: space.sm },
});
