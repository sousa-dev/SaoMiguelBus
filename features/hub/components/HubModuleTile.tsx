import { ChevronDown, ChevronUp, Pin, PinOff } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { HubModule } from '@/lib/modules';
import type { AppTheme } from '@/lib/theme';

type HubModuleTileProps = {
  module: HubModule;
  theme: AppTheme;
  editMode: boolean;
  pinned: boolean;
  pinBlocked: boolean;
  showPinReorder: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  listLayout: boolean;
  onOpen: () => void;
  onTogglePin: () => void;
  onReorderUp: () => void;
  onReorderDown: () => void;
};

export function HubModuleTile({
  module,
  theme,
  editMode,
  pinned,
  pinBlocked,
  showPinReorder,
  canMoveUp,
  canMoveDown,
  listLayout,
  onOpen,
  onTogglePin,
  onReorderUp,
  onReorderDown,
}: HubModuleTileProps) {
  const { t } = useTranslation();
  const { Icon } = module;
  const accent = module.accent ?? theme.primary;

  return (
    <Pressable
      onPress={editMode ? undefined : onOpen}
      style={[
        styles.tile,
        listLayout && styles.tileList,
        {
          backgroundColor: theme.card,
          borderColor: pinned ? theme.primary : theme.border,
          borderWidth: pinned ? 2 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t(module.labelKey)}
    >
      <View
        style={[
          styles.iconWrap,
          listLayout && styles.iconWrapList,
          { backgroundColor: `${accent}18` },
        ]}
      >
        <Icon color={accent} size={listLayout ? 28 : 32} strokeWidth={2} />
      </View>
      <Text
        style={[styles.label, listLayout && styles.labelList, { color: theme.text }]}
        numberOfLines={2}
      >
        {t(module.labelKey)}
      </Text>

      {editMode ? (
        <View style={styles.editRow}>
          <Pressable
            onPress={onTogglePin}
            disabled={pinBlocked && !pinned}
            style={[
              styles.pinBtn,
              {
                borderColor: theme.border,
                opacity: pinBlocked && !pinned ? 0.45 : 1,
              },
            ]}
            accessibilityLabel={pinned ? t('hubUnpin') : t('hubPin')}
          >
            {pinned ? (
              <Pin color={theme.primary} size={18} fill={theme.primary} />
            ) : (
              <PinOff color={theme.muted} size={18} />
            )}
          </Pressable>

          {showPinReorder ? (
            <View style={styles.reorderCol}>
              <Pressable
                onPress={onReorderUp}
                disabled={!canMoveUp}
                style={[styles.reorderBtn, { opacity: canMoveUp ? 1 : 0.35 }]}
                accessibilityLabel={t('hubMoveUp')}
              >
                <ChevronUp color={theme.text} size={20} />
              </Pressable>
              <Pressable
                onPress={onReorderDown}
                disabled={!canMoveDown}
                style={[styles.reorderBtn, { opacity: canMoveDown ? 1 : 0.35 }]}
                accessibilityLabel={t('hubMoveDown')}
              >
                <ChevronDown color={theme.text} size={20} />
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    margin: 6,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    minHeight: 120,
  },
  tileList: {
    flexDirection: 'row',
    minHeight: 72,
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  iconWrapList: { marginBottom: 0, width: 48, height: 48 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelList: { flex: 1, textAlign: 'left' },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  pinBtn: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  reorderCol: { gap: 2 },
  reorderBtn: { padding: 2 },
});
