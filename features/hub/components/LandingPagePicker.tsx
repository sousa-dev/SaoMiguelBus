import { Check, ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ModuleKey } from '@/config/island';
import { ListRow } from '@/components/ui/ListRow';
import { Sheet } from '@/components/ui/Sheet';
import { getModule, HUB_TAB } from '@/lib/modules';
import {
  getLandingPageOptions,
  resolveLandingPageKey,
  type LandingPageKey,
} from '@/lib/landing-page';
import { iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type LandingPagePickerProps = {
  enabledKeys: ModuleKey[];
  moduleOrderKeys?: ModuleKey[];
  value: LandingPageKey;
  onChange: (key: LandingPageKey) => void;
  hint?: string;
  /** Use inset surface when nested inside another card (hub edit). */
  inset?: boolean;
};

function optionIcon(key: LandingPageKey) {
  if (key === 'hub') {
    return HUB_TAB.Icon;
  }
  return getModule(key)?.Icon;
}

export function LandingPagePicker({
  enabledKeys,
  moduleOrderKeys,
  value,
  onChange,
  hint,
  inset = false,
}: LandingPagePickerProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const options = useMemo(
    () => getLandingPageOptions(enabledKeys, moduleOrderKeys),
    [enabledKeys, moduleOrderKeys],
  );

  const resolved = resolveLandingPageKey(value, enabledKeys);
  const selected = options.find((o) => o.key === resolved) ?? options[0];

  const pick = (key: LandingPageKey) => {
    setOpen(false);
    onChange(key);
    void Haptics.selectionAsync();
  };

  if (!options.length) {
    return null;
  }

  const SelectedIcon = optionIcon(resolved);
  const groupBg = inset ? theme.surfaceVariant : theme.card;
  const iconChipBg = inset ? theme.surface : theme.surfaceVariant;

  return (
    <>
      <View style={[styles.group, { backgroundColor: groupBg, borderColor: theme.border }]}>
        <ListRow
          leading={
            SelectedIcon ? (
              <View style={[styles.iconChip, { backgroundColor: iconChipBg }]}>
                <SelectedIcon size={iconSize.md} color={theme.primary} strokeWidth={2} />
              </View>
            ) : undefined
          }
          title={t(selected.labelKey)}
          subtitle={hint}
          onPress={() => setOpen(true)}
          showChevron={false}
          trailing={<ChevronDown size={iconSize.md} color={theme.muted} strokeWidth={2} />}
          accessibilityLabel={t('hubLandingPageLabel')}
        />
      </View>

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('hubLandingPageLabel')}>
        {hint ? (
          <Text style={[typography.caption, styles.sheetHint, { color: theme.onSurfaceMuted }]}>
            {hint}
          </Text>
        ) : null}
        <View
          style={[
            styles.sheetList,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          {options.map((opt) => {
            const isSelected = opt.key === resolved;
            const Icon = optionIcon(opt.key);
            return (
              <ListRow
                key={opt.key}
                leading={
                  Icon ? (
                    <View style={[styles.iconChip, { backgroundColor: iconChipBg }]}>
                      <Icon size={iconSize.md} color={theme.primary} strokeWidth={2} />
                    </View>
                  ) : undefined
                }
                title={t(opt.labelKey)}
                onPress={() => pick(opt.key)}
                showChevron={false}
                trailing={
                  isSelected ? <Check size={20} color={theme.primary} strokeWidth={2.5} /> : null
                }
                accessibilityLabel={`${t(opt.labelKey)}${isSelected ? ', selected' : ''}`}
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
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHint: { marginHorizontal: space.lg, marginBottom: space.sm },
  sheetList: {
    marginHorizontal: space.lg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
