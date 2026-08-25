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

  /**
   * The announcement for the `live` phase is OURS, not the server's.
   *
   * `transitSchedule.banner` is seeded per-island and translated by whoever
   * edits it in the admin; the one sentence riders see on the day the network
   * changes is worth pinning to the app's own locale files, where all eight
   * languages are edited together. The gate is untouched — `showBanner` still
   * decides whether a banner exists at all — this only replaces the copy once
   * one is showing.
   */
  const liveText = phase === 'live' ? t('transitScheduleLiveBanner') : null;
  const announcement = liveText ?? bannerText;

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

  /**
   * The preview switch as ONE control, label included.
   *
   * The label is the only thing that says what the switch does, so it has to
   * be part of the target — a switch that only responds to its 40pt thumb is a
   * miss on a row that looks tappable across its full width. The whole row
   * carries `role="switch"` and the `Switch` itself is hidden from
   * accessibility, so a screen reader announces one control rather than a
   * label and a switch that appear unrelated.
   *
   * The text follows the state: off it offers ("Show the new timetables"), on
   * it reports ("Showing the new timetables"). A static label next to a switch
   * makes the rider derive the current state from the thumb position alone.
   */
  const toggleLabel = isPreviewing
    ? t('transitSchedulePreviewToggleOn')
    : t('transitSchedulePreviewToggle');

  // `withIcon` rather than nesting this inside an icon row: a Pressable that
  // has to fill a ROW parent needs `flex: 1`, and the same style in the COLUMN
  // parent of the standalone card would stretch it vertically instead.
  const renderPreviewToggle = (withIcon: boolean) => (
    <Pressable
      onPress={() => applyPreviewing(!isPreviewing)}
      style={styles.toggleRow}
      accessibilityRole="switch"
      accessibilityState={{ checked: isPreviewing }}
      accessibilityLabel={toggleLabel}
    >
      {withIcon ? <Info size={18} color={accent} /> : null}
      <Text style={[typography.label, { color: theme.text, flex: 1 }]}>{toggleLabel}</Text>
      <Switch
        value={isPreviewing}
        onValueChange={applyPreviewing}
        accessible={false}
        importantForAccessibility="no"
      />
    </Pressable>
  );

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
        {/* Switch straight from the explanation, without hunting for the row
            behind it. `applyPreviewing` re-points `dialog`, so the sheet flips
            to the other explanation in place rather than closing. Dismissal
            stays the last, bottom-most action. */}
        {showToggle ? (
          <Button label={toggleLabel} variant="outline" onPress={() => applyPreviewing(!isPreviewing)} />
        ) : null}
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
        {renderPreviewToggle(true)}
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
            {showToggle ? t('transitSchedulePreviewChip') : announcement}
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
        <Text style={[typography.body, { color: theme.text, flex: 1 }]}>{announcement}</Text>
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

      {showToggle ? renderPreviewToggle(false) : null}
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
  // Vertical padding so the row is a comfortable target across its full width,
  // not just where the switch happens to be.
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
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
