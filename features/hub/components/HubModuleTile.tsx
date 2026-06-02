import * as Haptics from 'expo-haptics';
import { ChevronDown, ChevronRight, ChevronUp, Pin, PinOff } from 'lucide-react-native';
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
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { Icon } = module;
  const accent = module.accent ?? theme.primary;
  const label = t(module.labelKey);
  const descKey = DESC_KEYS[module.key];
  const subtitle = descKey ? t(descKey) : undefined;

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
        <View style={styles.editRow}>
          <IconButton
            icon={pinned ? Pin : PinOff}
            accessibilityLabel={pinned ? t('hubUnpin') : t('hubPin')}
            color={pinned ? theme.primary : theme.muted}
            disabled={pinBlocked && !pinned}
            onPress={handleTogglePin}
          />
          {showPinReorder ? (
            <View style={styles.reorderCol}>
              <IconButton
                icon={ChevronUp}
                accessibilityLabel={t('hubMoveUp')}
                color={theme.text}
                disabled={!canMoveUp}
                onPress={onReorderUp}
              />
              <IconButton
                icon={ChevronDown}
                accessibilityLabel={t('hubMoveDown')}
                color={theme.text}
                disabled={!canMoveDown}
                onPress={onReorderDown}
              />
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
          accessibilityHint={t('hubOpensModule', { module: label })}
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
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.md,
    gap: space.xs,
  },
  reorderCol: { flexDirection: 'column' },
});
