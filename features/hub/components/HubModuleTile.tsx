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

  const tileBody = (
    <>
      {!editMode && pinned ? (
        <View style={[styles.pinBadge, { backgroundColor: theme.primary }]} accessibilityElementsHidden>
          <Pin size={12} color={theme.onPrimary} fill={theme.onPrimary} />
        </View>
      ) : null}

      {showPreview ? (
        <View style={[styles.previewWrap, listLayout && styles.previewWrapList]}>{preview}</View>
      ) : (
        <View
          style={[
            styles.iconWrap,
            listLayout && styles.iconWrapList,
            { backgroundColor: withAlpha(accent, 0.12) },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Icon color={accent} size={listLayout ? 28 : 32} strokeWidth={2} />
        </View>
      )}

      <View style={[styles.textCol, listLayout && styles.textColList]}>
        <Text style={[typography.headline, { color: theme.text, fontSize: listLayout ? 16 : 14 }]} numberOfLines={2}>
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

      {listLayout && !editMode ? <ChevronRight color={theme.muted} size={20} /> : null}

      {editMode ? (
        <View style={styles.editCol}>
          <View style={styles.editRow}>
            <IconButton
              icon={pinned ? Pin : PinOff}
              accessibilityLabel={pinned ? t('hubUnpin') : t('hubPin')}
              color={pinned ? theme.primary : theme.muted}
              disabled={pinBlocked && !pinned}
              onPress={handleTogglePin}
            />
            {showBarReorder ? (
              <View style={styles.reorderCol} accessibilityLabel={t('hubBarOrderLabel')}>
                <IconButton
                  icon={ChevronUp}
                  accessibilityLabel={t('hubBarMoveUp')}
                  color={theme.text}
                  disabled={!canBarMoveUp}
                  onPress={onBarReorderUp}
                />
                <IconButton
                  icon={ChevronDown}
                  accessibilityLabel={t('hubBarMoveDown')}
                  color={theme.text}
                  disabled={!canBarMoveDown}
                  onPress={onBarReorderDown}
                />
              </View>
            ) : null}
          </View>
          {showGridReorder ? (
            <View style={styles.editRow}>
              <Text style={[typography.caption, styles.gridReorderLabel, { color: theme.muted }]}>
                {t('hubGridOrderLabel')}
              </Text>
              <View style={styles.reorderCol}>
                <IconButton
                  icon={ChevronUp}
                  accessibilityLabel={t('hubGridMoveUp')}
                  color={theme.text}
                  disabled={!canGridMoveUp}
                  onPress={onGridReorderUp}
                />
                <IconButton
                  icon={ChevronDown}
                  accessibilityLabel={t('hubGridMoveDown')}
                  color={theme.text}
                  disabled={!canGridMoveDown}
                  onPress={onGridReorderDown}
                />
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </>
  );

  return (
    <View style={[styles.outer, listLayout && styles.outerList]}>
      <Card
        onPress={editMode ? undefined : onOpen}
        elevated
        style={[styles.card, listLayout && styles.cardList]}
        accessibilityLabel={editMode ? undefined : label}
      >
        <View
          style={[styles.inner, listLayout && styles.innerList]}
          accessibilityRole="button"
          accessibilityState={{ selected: pinned }}
          accessibilityHint={editMode ? undefined : t('hubOpensModule', { module: label })}
        >
          {tileBody}
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
  inner: { alignItems: 'center', position: 'relative' },
  innerList: { flexDirection: 'row', alignItems: 'center', gap: space.md },
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
  textCol: { alignItems: 'center' },
  textColList: { flex: 1, alignItems: 'flex-start' },
  editCol: { width: '100%', marginTop: space.md, gap: space.sm },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  gridReorderLabel: { marginRight: space.xs },
  reorderCol: { flexDirection: 'column' },
});
