import { MapPin, X } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { normalizeToken } from '@/features/minibus/routeSearch';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  label?: string;
  value: string;
  placeholder?: string;
  stops: string[];
  onChangeText: (text: string) => void;
};

const LIST_MAX_HEIGHT = 220;

function sortStops(stops: string[]): string[] {
  return [...stops].sort((a, b) => a.localeCompare(b, 'pt'));
}

export function MinibusStopPicker({ label, value, placeholder, stops, onChangeText }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const options = useMemo(() => {
    const sorted = sortStops(stops);
    const query = normalizeToken(value);
    if (!query) {
      return sorted;
    }
    return sorted.filter((stop) => normalizeToken(stop).includes(query));
  }, [value, stops]);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[typography.label, { color: theme.muted }]}>{label}</Text> : null}
      <View style={[styles.field, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
        <MapPin size={20} color={theme.primary} style={styles.pin} />
        <TextInput
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={theme.muted}
          value={value}
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
          onChangeText={onChangeText}
          style={[styles.input, typography.body, { color: theme.text }]}
          returnKeyType="search"
        />
        {value.length > 0 ? (
          <IconButton
            icon={X}
            variant="ghost"
            size="sm"
            color={theme.muted}
            accessibilityLabel={t('clearInput')}
            onPress={() => onChangeText('')}
          />
        ) : null}
      </View>

      {options.length > 0 ? (
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={[styles.list, { borderColor: theme.border, maxHeight: LIST_MAX_HEIGHT }]}
          contentContainerStyle={styles.listContent}
        >
          {options.map((stop) => {
            const selected = value === stop;
            return (
              <Pressable
                key={stop}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onChangeText(stop)}
                style={[
                  styles.option,
                  selected && { backgroundColor: theme.surfaceVariant },
                ]}
              >
                <Text
                  style={[
                    typography.body,
                    { color: theme.text },
                    selected && { fontWeight: '600' },
                  ]}
                >
                  {stop}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingRight: space.md,
  },
  pin: { marginLeft: space.md },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: space.sm,
    fontSize: 16,
  },
  list: {
    marginTop: 4,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    zIndex: 10,
  },
  listContent: { paddingVertical: space.xs },
  option: { paddingHorizontal: space.md, paddingVertical: space.sm },
});
