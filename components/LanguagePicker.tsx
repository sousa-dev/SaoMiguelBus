import { Check, ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LocaleFlag } from '@/components/LocaleFlag';
import { ListRow } from '@/components/ui/ListRow';
import { Sheet } from '@/components/ui/Sheet';
import { getLanguageDisplayName, isActiveLocale } from '@/lib/i18n';
import { iconSize } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type LanguagePickerProps = {
  locales: string[];
  activeLocale: string;
  onSelect: (code: string) => void | Promise<void>;
};

export function LanguagePicker({ locales, activeLocale, onSelect }: LanguagePickerProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const selectedCode = useMemo(
    () => locales.find((code) => isActiveLocale(activeLocale, code)) ?? locales[0] ?? 'pt',
    [activeLocale, locales],
  );

  const pick = async (code: string) => {
    setOpen(false);
    await onSelect(code);
    void Haptics.selectionAsync();
  };

  if (!locales.length) {
    return null;
  }

  return (
    <>
      <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ListRow
          leading={<LocaleFlag locale={selectedCode} size={28} />}
          title={getLanguageDisplayName(selectedCode)}
          onPress={() => setOpen(true)}
          trailing={<ChevronDown size={iconSize.md} color={theme.muted} strokeWidth={2} />}
          accessibilityLabel={t('settingsLanguage')}
        />
      </View>

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('settingsLanguage')}>
        <View style={[styles.sheetList, { borderColor: theme.border }]}>
          {locales.map((code) => {
            const selected = isActiveLocale(activeLocale, code);
            return (
              <ListRow
                key={code}
                leading={<LocaleFlag locale={code} size={26} />}
                title={getLanguageDisplayName(code)}
                onPress={() => pick(code)}
                showChevron={false}
                trailing={
                  selected ? <Check size={20} color={theme.primary} strokeWidth={2.5} /> : null
                }
                accessibilityLabel={`${getLanguageDisplayName(code)}${selected ? ', selected' : ''}`}
              />
            );
          })}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sheetList: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
