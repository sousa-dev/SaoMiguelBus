import { Info, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

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
          <Switch
            value={isPreviewing}
            onValueChange={(next) => {
              setPreviewing(next);
              track('transit', 'schedule_preview_toggled', {
                enabled: next,
                phase: phase ?? '',
              });
            }}
          />
        </View>
      </View>
    );
  }

  // Dismissed collapses to a slim chip rather than disappearing: while a preview
  // is on offer the user needs the way back to it.
  if (dismissible && isBannerDismissed) {
    return (
      <Pressable
        onPress={() => setPreviewing(!isPreviewing)}
        style={[styles.chip, { borderColor: accent, backgroundColor: theme.card }]}
      >
        <Info size={14} color={accent} />
        <Text style={[typography.caption, { color: accent }]}>
          {showToggle ? t('transitSchedulePreviewChip') : bannerText}
        </Text>
      </Pressable>
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
          <Switch
            value={isPreviewing}
            onValueChange={(next) => {
              setPreviewing(next);
              track('transit', 'schedule_preview_toggled', {
                enabled: next,
                phase: phase ?? '',
              });
            }}
          />
        </View>
      ) : null}
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
