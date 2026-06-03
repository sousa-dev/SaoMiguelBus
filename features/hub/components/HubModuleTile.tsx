import * as Haptics from 'expo-haptics';
import { ChevronDown, ChevronRight, ChevronUp, Pin, PinOff } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { withAlpha } from '@/lib/color-utils';
import type { HubModule } from '@/lib/modules';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const DESC_KEYS: Partial<Record<HubModule['key'], string>> = {
  transit: 'hubModuleTransitDesc',
  events: 'hubModuleToursDesc',
  news: 'hubModuleNewsDesc',
  seismic: 'hubModuleSeismicDesc',
  trails: 'hubModuleTrailsDesc',
  marketplace: 'hubModuleMarketplaceDesc',
  traffic: 'hubModuleTrafficDesc',
};

type ReorderButtonsProps = {
  moveUpLabel: string;
  moveDownLabel: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onUp: () => void;
  onDown: () => void;
};

function ReorderButtons({
  moveUpLabel,
  moveDownLabel,
  canMoveUp,
  canMoveDown,
  onUp,
  onDown,
}: ReorderButtonsProps) {
  return (
    <View style={styles.reorderCol}>
      <IconButton
        icon={ChevronUp}
        size="sm"
        accessibilityLabel={moveUpLabel}
        disabled={!canMoveUp}
        onPress={onUp}
      />
      <IconButton
        icon={ChevronDown}
        size="sm"
        accessibilityLabel={moveDownLabel}
        disabled={!canMoveDown}
        onPress={onDown}
      />
    </View>
  );
}

type HubModuleTileProps = {
  module: HubModule;
  editMode: boolean;
  pinned: boolean;
  pinBlocked: boolean;
  showBarReorder: boolean;
  showGridReorder: boolean;
  canBarMoveUp: boolean;
  canBarMoveDown: boolean;
  canGridMoveUp: boolean;
  canGridMoveDown: boolean;
  listLayout: boolean;
  preview?: ReactNode;
  onOpen: () => void;
  onTogglePin: () => void;
  onBarReorderUp: () => void;
  onBarReorderDown: () => void;
  onGridReorderUp: () => void;
  onGridReorderDown: () => void;
};

export function HubModuleTile({
  module,
  editMode,
  pinned,
  pinBlocked,
  showBarReorder,
  showGridReorder,
  canBarMoveUp,
  canBarMoveDown,
  canGridMoveUp,
  canGridMoveDown,
  listLayout,
  preview,
  onOpen,
  onTogglePin,
  onBarReorderUp,
  onBarReorderDown,
  onGridReorderUp,
  onGridReorderDown,
}: HubModuleTileProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { Icon } = module;
  const accent = module.accent ?? theme.primary;
  const label = t(module.labelKey);
  const descKey = DESC_KEYS[module.key];
  const subtitle = !editMode && !preview && descKey ? t(descKey) : undefined;
  const showPreview = !editMode && preview;

  const handleTogglePin = () => {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    onTogglePin();
  };

  const editToolbar =
    editMode ? (
      <View
        style={[
          styles.editToolbar,
          listLayout ? styles.editToolbarList : styles.editToolbarGrid,
          !listLayout && { borderTopColor: theme.border },
        ]}
      >
        <IconButton
          icon={pinned ? Pin : PinOff}
          size="sm"
          accessibilityLabel={pinned ? t('hubUnpin') : t('hubPin')}
          color={pinned ? theme.primary : theme.muted}
          disabled={pinBlocked && !pinned}
          onPress={handleTogglePin}
        />
        {showBarReorder ? (
          <ReorderButtons
            moveUpLabel={t('hubBarMoveUp')}
            moveDownLabel={t('hubBarMoveDown')}
            canMoveUp={canBarMoveUp}
            canMoveDown={canBarMoveDown}
            onUp={onBarReorderUp}
            onDown={onBarReorderDown}
          />
        ) : null}
        {showGridReorder ? (
          <ReorderButtons
            moveUpLabel={t('hubGridMoveUp')}
            moveDownLabel={t('hubGridMoveDown')}
            canMoveUp={canGridMoveUp}
            canMoveDown={canGridMoveDown}
            onUp={onGridReorderUp}
            onDown={onGridReorderDown}
          />
        ) : null}
      </View>
    ) : null;

  const iconBlock = showPreview ? (
    <View style={[styles.previewWrap, listLayout && styles.previewWrapList]}>{preview}</View>
  ) : (
    <View
      style={[
        styles.iconWrap,
        listLayout && styles.iconWrapList,
        editMode && !listLayout && styles.iconWrapEditGrid,
        { backgroundColor: withAlpha(accent, 0.12) },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Icon color={accent} size={listLayout ? 28 : editMode ? 28 : 32} strokeWidth={2} />
    </View>
  );

  const labelBlock = (
    <View style={[styles.textCol, listLayout && styles.textColList, editMode && !listLayout && styles.textColEditGrid]}>
      <Text
        style={[typography.headline, { color: theme.text, fontSize: listLayout ? 16 : editMode ? 15 : 14 }]}
        numberOfLines={2}
      >
        {label}
      </Text>
      {subtitle && !listLayout ? (
        <Text style={[typography.caption, { color: theme.muted, marginTop: 4 }]} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
      {subtitle && listLayout ? (
        <Text style={[typography.caption, { color: theme.muted, marginTop: 2 }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.outer, listLayout && styles.outerList]}>
      <Card
        onPress={editMode ? undefined : onOpen}
        elevated
        style={[styles.card, listLayout && styles.cardList, editMode && listLayout && styles.cardEditList]}
        accessibilityLabel={editMode ? undefined : label}
      >
        <View
          style={[
            styles.inner,
            listLayout && styles.innerList,
            editMode && !listLayout && styles.innerEditGrid,
            editMode && listLayout && styles.innerEditList,
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: pinned }}
          accessibilityHint={editMode ? undefined : t('hubOpensModule', { module: label })}
        >
          {!editMode && pinned ? (
            <View style={[styles.pinBadge, { backgroundColor: theme.primary }]} accessibilityElementsHidden>
              <Pin size={12} color={theme.onPrimary} fill={theme.onPrimary} />
            </View>
          ) : null}

          {listLayout ? (
            <>
              {iconBlock}
              {labelBlock}
              {editMode ? editToolbar : <ChevronRight color={theme.muted} size={20} />}
            </>
          ) : (
            <>
              {iconBlock}
              {labelBlock}
              {editToolbar}
            </>
          )}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, margin: space.sm },
  outerList: { flex: undefined, width: '100%' },
  card: { padding: space.lg, borderRadius: radius.lg },
  cardList: { marginHorizontal: space.sm },
  cardEditList: { paddingVertical: space.md },
  inner: { alignItems: 'center', position: 'relative' },
  innerList: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  innerEditList: { minHeight: 56 },
  innerEditGrid: { width: '100%', gap: space.sm },
  pinBadge: {
    position: 'absolute',
    top: -space.sm,
    right: -space.sm,
    zIndex: 1,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewWrap: { width: '100%', marginBottom: space.sm },
  previewWrapList: { flex: 1, maxWidth: 120, marginBottom: 0 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  iconWrapList: { marginBottom: 0, width: 48, height: 48 },
  iconWrapEditGrid: { marginBottom: 0 },
  textCol: { alignItems: 'center' },
  textColList: { flex: 1, alignItems: 'flex-start', minWidth: 0 },
  textColEditGrid: { width: '100%' },
  editToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  editToolbarList: {
    flexShrink: 0,
    marginLeft: space.xs,
  },
  editToolbarGrid: {
    justifyContent: 'center',
    width: '100%',
    marginTop: space.xs,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reorderCol: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: -space.xs,
    marginBottom: -space.xs,
  },
});
