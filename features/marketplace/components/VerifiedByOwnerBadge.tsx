import { CircleCheck } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const TOOLTIP_MAX_WIDTH = 280;
const VIEWPORT_MARGIN = 16;
const GAP = 8;

type AnchorRect = { x: number; y: number; width: number; height: number };

export function VerifiedByOwnerBadge() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const anchorRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });
  const tooltipText = t('marketplaceVerifiedTooltip');

  const maxTooltipWidth = Math.min(TOOLTIP_MAX_WIDTH, windowWidth - VIEWPORT_MARGIN * 2);

  const openTooltip = (event: GestureResponderEvent) => {
    event.stopPropagation();
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchorRect({ x, y, width, height });
      setTooltipSize({ width: 0, height: 0 });
      setOpen(true);
    });
  };

  const onTooltipLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setTooltipSize((current) =>
      current.width === width && current.height === height ? current : { width, height },
    );
  };

  const tooltipLeft =
    anchorRect == null
      ? VIEWPORT_MARGIN
      : Math.max(
          VIEWPORT_MARGIN,
          Math.min(anchorRect.x, windowWidth - Math.max(tooltipSize.width, maxTooltipWidth) - VIEWPORT_MARGIN),
        );

  const belowTop = anchorRect == null ? 0 : anchorRect.y + anchorRect.height + GAP;
  const tooltipHeight = tooltipSize.height || 72;
  const fitsBelow = belowTop + tooltipHeight <= windowHeight - VIEWPORT_MARGIN;
  const tooltipTop = anchorRect == null ? 0 : fitsBelow ? belowTop : anchorRect.y - GAP - tooltipHeight;

  return (
    <>
      <View ref={anchorRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('marketplaceVerifiedBadge')}
          accessibilityHint={t('marketplaceVerifiedTooltip')}
          onPress={openTooltip}
          hitSlop={8}
        >
          <CircleCheck size={iconSize.md} color={theme.success} strokeWidth={2.5} />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityRole="button">
          {anchorRect ? (
            <View
              onLayout={onTooltipLayout}
              style={[
                styles.tooltip,
                {
                  top: tooltipTop,
                  left: tooltipLeft,
                  maxWidth: maxTooltipWidth,
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  shadowColor: theme.text,
                },
              ]}
            >
              <Pressable onPress={(event) => event.stopPropagation()}>
                <Text style={[typography.caption, styles.tooltipText, { color: theme.text }]}>
                  {tooltipText}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tooltip: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
    alignSelf: 'flex-start',
  },
  tooltipText: {
    flexShrink: 1,
  },
});
