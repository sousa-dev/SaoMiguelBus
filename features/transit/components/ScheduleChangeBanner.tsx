import { Info, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { useScheduleConfig } from '@/features/transit/hooks/useScheduleConfig';
import { track } from '@/lib/analytics';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

/**
 * The changeover banner (03 §2).
 *
 * Every decision — whether to show it, whether to offer the toggle, what the copy
 * says — comes from `useScheduleConfig`, which reads the server's
 * `transitSchedule`. There is no date in this file. It renders nothing until a
 * cutover instant is armed, which is why it is invisible against production
 * today even though the server is already sending banner copy.
 */
export function ScheduleChangeBanner() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const {
    showBanner,
    showToggle,
    bannerText,
    isPreviewing,
    setPreviewing,
    banner,
    isBannerDismissed,
    dismissBanner,
    phase,
  } = useScheduleConfig(i18n.language);

  const dismissible = banner?.dismissible ?? false;
  const warning = banner?.tone === 'warning';
  const accent = warning ? theme.warning : theme.primary;

  // Which explanation to show after the switch moves — null while closed.
  const [dialog, setDialog] = useState<'on' | 'off' | null>(null);

  /**
   * The single path for every way this banner can flip the preview: both
   * switches and the collapsed chip.
   *
   * The switch changes what the SEARCH returns — different routes, different
   * stops, different times — but the rider is looking at a banner, not at
   * results, so nothing on screen moves and the consequence only shows up
   * later, in a search they will have stopped connecting to this toggle. The
   * sheet says it at the moment of the decision. It explains rather than asks:
   * the toggle has already applied, and both directions are one tap to undo.
   */
  const applyPreviewing = (next: boolean) => {
    setPreviewing(next);
    setDialog(next ? 'on' : 'off');
    track('transit', 'schedule_preview_toggled', {
      enabled: next,
      phase: phase ?? '',
    });
  };

  const explainer = (
    <Sheet
      visible={dialog !== null}
      onClose={() => setDialog(null)}
      title={
        dialog === 'off'
          ? t('transitSchedulePreviewDialogOffTitle')
          : t('transitSchedulePreviewDialogOnTitle')
      }
      scrollable={false}
    >
      <View style={styles.dialogBody}>
        <Text style={[typography.body, { color: theme.text }]}>
          {dialog === 'off'
            ? t('transitSchedulePreviewDialogOffBody')
            : t('transitSchedulePreviewDialogOnBody')}
        </Text>
        <Button
          label={t('transitSchedulePreviewDialogAction')}
          onPress={() => setDialog(null)}
        />
      </View>
    </Sheet>
  );

  if (!showBanner || !bannerText) {
    // The server can offer a preview before a cutover instant is armed, and the
    // banner is gated on that instant because its copy announces a dated
    // changeover. The toggle carries no such claim, so it still needs a home.
    if (!showToggle) {
      return null;
    }
    return (
      <View style={[styles.wrap, { borderColor: accent, backgroundColor: theme.card }]}>
        <View style={styles.row}>
          <Info size={18} color={accent} />
          <Text style={[typography.label, { color: theme.text, flex: 1 }]}>
            {t('transitSchedulePreviewToggle')}
          </Text>
          <Switch value={isPreviewing} onValueChange={applyPreviewing} />
        </View>
        {explainer}
      </View>
    );
  }

  // Dismissed collapses to a slim chip rather than disappearing: while a preview
  // is on offer the user needs the way back to it.
  if (dismissible && isBannerDismissed) {
    return (
      <>
        <Pressable
          onPress={() => applyPreviewing(!isPreviewing)}
          style={[styles.chip, { borderColor: accent, backgroundColor: theme.card }]}
        >
          <Info size={14} color={accent} />
          <Text style={[typography.caption, { color: accent }]}>
            {showToggle ? t('transitSchedulePreviewChip') : bannerText}
          </Text>
        </Pressable>
        {explainer}
      </>
    );
  }

  return (
    <View style={[styles.wrap, { borderColor: accent, backgroundColor: theme.card }]}>
      <View style={styles.row}>
        <Info size={18} color={accent} />
        <Text style={[typography.body, { color: theme.text, flex: 1 }]}>{bannerText}</Text>
        {dismissible ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('close')}
            onPress={() => {
              dismissBanner();
              track('transit', 'schedule_banner_dismissed', {
                banner_id: banner?.id ?? '',
                phase: phase ?? '',
              });
            }}
            hitSlop={8}
          >
            <X size={18} color={theme.muted} />
          </Pressable>
        ) : null}
      </View>

      {showToggle ? (
        <View style={styles.row}>
          <Text style={[typography.label, { color: theme.text, flex: 1 }]}>
            {t('transitSchedulePreviewToggle')}
          </Text>
          <Switch value={isPreviewing} onValueChange={applyPreviewing} />
        </View>
      ) : null}
      {explainer}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
    marginBottom: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  dialogBody: {
    paddingHorizontal: space.lg,
    gap: space.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    marginBottom: space.md,
  },
});
