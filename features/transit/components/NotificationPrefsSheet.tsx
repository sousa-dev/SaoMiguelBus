/**
 * What the rider is choosing when they arm a journey — and the same sheet, in
 * "edit default" mode, from the settings row.
 *
 * Presented on EVERY arm rather than only the first, pre-filled from the stored
 * default (02 §4). That is what makes the stored value a starting point rather
 * than a decision the rider made once and now has to go and find: they see what
 * is about to happen, adjust it or not, and only "Save as my default" writes it
 * back. Unchecked — the common case — the selection applies to this journey
 * alone and the default is untouched (03 §3).
 *
 * Two rows can be unavailable, for two different reasons, and the sheet has to
 * tell them apart:
 *
 *  - **Change is coming** is HIDDEN on a direct journey. There is no change to
 *    warn about, and an inert row invites the question "why can't I tick that?"
 *  - **Get off / Journey complete** are DISABLED, visibly, when Android will not
 *    commit to an exact minute (11 §A1.1). Hiding them would be dishonest —
 *    they exist, they are simply unsafe right now — so they are greyed with the
 *    reason and a route to the fix.
 */

import { BellRing, Clock, Flag, MapPin, Send } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Sheet } from '@/components/ui/Sheet';
import { NotificationsExactAlarmSheet } from '@/features/transit/components/NotificationsExactAlarmSheet';
import { addExactAlarmListener, exactAlarmGate } from '@/lib/notifications/exact-alarms';
import { useNotificationPreviewSource } from '@/features/transit/hooks/useNotificationPreviewSource';
import { trackTestSent } from '@/lib/notifications/analytics';
import { sendTestNotification } from '@/lib/notifications/scheduler';
import type { ActiveTrack } from '@/lib/profile-store';
import {
  LEAD_MINUTE_OPTIONS,
  type AlarmType,
  type NotificationPrefs,
} from '@/lib/notifications/types';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
  /** `journey` arms a specific trip; `default` edits the stored preferences. */
  mode: 'journey' | 'default';
  initial: NotificationPrefs;
  /** False on a direct journey — the change row is hidden, not disabled. */
  showChange?: boolean;
  onClose: () => void;
  onConfirm: (prefs: NotificationPrefs, saveAsDefault: boolean) => void;
  /** The journey this was opened for, so a test preview names their own route. */
  previewTrack?: ActiveTrack;
  /** Raised when a test could not be sent because notifications are blocked. */
  onTestBlocked?: () => void;
};

const ALARM_ICONS: Record<AlarmType, typeof Clock> = {
  leaveNow: Clock,
  change: BellRing,
  alight: MapPin,
  complete: Flag,
};

export function NotificationPrefsSheet({
  visible,
  mode,
  initial,
  showChange = true,
  onClose,
  onConfirm,
  previewTrack,
  onTestBlocked,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [draft, setDraft] = useState<NotificationPrefs>(initial);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  // Read once per opening rather than on every render: it is a native call, and
  // the rider cannot change the permission without leaving the sheet — at which
  // point re-opening re-reads it.
  const [gate, setGate] = useState(() => exactAlarmGate());
  const [exactSheetVisible, setExactSheetVisible] = useState(false);
  /** Which row was last tested, so the confirmation appears under that row. */
  const [testedType, setTestedType] = useState<AlarmType | null>(null);

  useEffect(() => {
    if (visible) {
      setDraft(initial);
      setSaveAsDefault(false);
      setGate(exactAlarmGate());
      setTestedType(null);
    }
  }, [visible, initial]);

  // A rider who fixes the permission while this sheet is open should see the
  // greyed rows come back, rather than having to close and reopen it. The
  // foreground resume covers the trip the app started; this covers a grant made
  // anywhere else (11 §A1 requirement 4).
  useEffect(() => {
    if (!visible) {
      return;
    }
    const subscription = addExactAlarmListener(() => setGate(exactAlarmGate()));
    return () => subscription.remove();
  }, [visible]);

  // `askable` is the only state that means "this device will deliver late".
  // `unsupported` is iOS, where precision is never in question.
  const preciseOff = gate === 'askable';

  const setAlarm = (type: AlarmType, patch: Partial<NotificationPrefs[AlarmType]>) =>
    setDraft((current) => ({ ...current, [type]: { ...current[type], ...patch } }));

  const previewSource = useNotificationPreviewSource({ track: previewTrack });

  /**
   * Send one real notification of this type.
   *
   * Uses the lead time currently on screen rather than the stored one, so a
   * rider who has just dragged "Time to leave" to 30 minutes sees 30 in the
   * test — otherwise the preview quietly contradicts the control above it.
   */
  const sendTest = (type: AlarmType) => {
    void (async () => {
      const result = await sendTestNotification(
        type,
        { ...previewSource, leadMinutes: draft[type].leadMinutes },
        'settings_row',
      );
      if (result === 'blocked') {
        onTestBlocked?.();
        return;
      }
      if (result !== 'granted') {
        return;
      }
      trackTestSent(type, 'prefs_sheet');
      setTestedType(type);
    })();
  };

  const rows = useMemo(
    () =>
      (
        [
          { type: 'leaveNow', label: 'notificationsTypeLeaveNow', lead: true, needsPrecise: false },
          { type: 'change', label: 'notificationsTypeChange', lead: true, needsPrecise: false },
          { type: 'alight', label: 'notificationsTypeAlight', lead: false, needsPrecise: true },
          { type: 'complete', label: 'notificationsTypeComplete', lead: false, needsPrecise: true },
        ] as const
      ).filter((row) => row.type !== 'change' || showChange),
    [showChange],
  );

  // A filled bell that promises nothing would be a lie about what the app is
  // about to do, so the primary action refuses an empty selection (02 §4.3).
  // A row that is disabled for precise timing cannot count towards it either.
  const chosen = rows.filter(
    (row) => draft[row.type].enabled && !(row.needsPrecise && preciseOff),
  ).length;
  const canConfirm = chosen > 0;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t(mode === 'journey' ? 'notificationsSheetTitle' : 'notificationsSheetDefaultTitle')}
    >
      <View style={styles.body}>
        {rows.map((row) => {
          const Icon = ALARM_ICONS[row.type];
          const blocked = row.needsPrecise && preciseOff;
          const enabled = draft[row.type].enabled && !blocked;
          return (
            <View key={row.type} style={styles.row}>
              <View style={styles.rowHead}>
                <View style={[styles.iconWrap, { backgroundColor: theme.surfaceVariant }]}>
                  <Icon
                    size={iconSize.md}
                    color={blocked ? theme.muted : theme.primary}
                    strokeWidth={2}
                  />
                </View>
                <View style={styles.rowLabel}>
                  <Text
                    style={[typography.bodyStrong, { color: blocked ? theme.muted : theme.text }]}
                  >
                    {t(row.label)}
                  </Text>
                  {!blocked ? (
                  <Pressable
                    onPress={() => sendTest(row.type)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('notificationsTestButton')} — ${t(row.label)}`}
                    hitSlop={8}
                    style={[styles.testButton, { borderColor: theme.border }]}
                  >
                    <Send size={14} color={theme.primary} strokeWidth={2} />
                    <Text style={[typography.label, { color: theme.primary }]}>
                      {t('notificationsTestButton')}
                    </Text>
                  </Pressable>
                ) : null}
                {blocked ? (
                    <Text style={[typography.label, { color: theme.muted }]}>
                      {t('notificationsExactUnavailableRow')}
                    </Text>
                  ) : null}
                </View>
                {blocked ? (
                  // Reaching for an alarm that needs precise timing is the one
                  // honest moment to ask for it — 05 §4B.4 wants the prompt
                  // here, not stacked behind the notification prompt.
                  <Pressable
                    onPress={() => setExactSheetVisible(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('notificationsExactTitle')}
                  >
                    <Text style={[typography.label, { color: theme.primary }]}>
                      {t('notificationsExactInlineAction')}
                    </Text>
                  </Pressable>
                ) : (
                  <Switch
                    value={enabled}
                    onValueChange={(next) => setAlarm(row.type, { enabled: next })}
                    accessibilityLabel={t(row.label)}
                  />
                )}
              </View>

              {testedType === row.type ? (
                <Text style={[typography.label, styles.testSent, { color: theme.success }]}>
                  {t('notificationsTestSent')}
                </Text>
              ) : null}

              {row.lead && enabled ? (
                <View style={styles.chips}>
                  {LEAD_MINUTE_OPTIONS.map((minutes) => (
                    <Chip
                      key={minutes}
                      label={t('notificationsLeadMinutes', { minutes })}
                      selected={draft[row.type].leadMinutes === minutes}
                      onPress={() => setAlarm(row.type, { leadMinutes: minutes })}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}

        {preciseOff ? (
          <Pressable
            onPress={() => setExactSheetVisible(true)}
            accessibilityRole="button"
            style={[styles.preciseNudge, { backgroundColor: theme.warningSurface }]}
          >
            <Text style={[typography.label, { color: theme.text }]}>
              {t('notificationsExactInlineOff')}
            </Text>
            <Text style={[typography.label, { color: theme.primary }]}>
              {t('notificationsExactInlineAction')}
            </Text>
          </Pressable>
        ) : null}

        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        {mode === 'default' ? (
          <View style={styles.rowHead}>
            <View style={styles.rowLabel}>
              <Text style={[typography.body, { color: theme.text }]}>
                {t('notificationsPinnedRoutes')}
              </Text>
            </View>
            <Switch
              value={draft.notifyPinnedRoutes}
              onValueChange={(next) => setDraft((c) => ({ ...c, notifyPinnedRoutes: next }))}
              accessibilityLabel={t('notificationsPinnedRoutes')}
            />
          </View>
        ) : (
          <View style={styles.rowHead}>
            <View style={styles.rowLabel}>
              <Text style={[typography.body, { color: theme.text }]}>
                {t('notificationsSaveDefault')}
              </Text>
            </View>
            <Switch
              value={saveAsDefault}
              onValueChange={setSaveAsDefault}
              accessibilityLabel={t('notificationsSaveDefault')}
            />
          </View>
        )}

        <Button
          label={
            canConfirm
              ? t(mode === 'journey' ? 'notificationsConfirm' : 'notificationsSave')
              : t('notificationsChooseOne')
          }
          disabled={!canConfirm}
          fullWidth
          onPress={() => onConfirm(draft, mode === 'default' ? true : saveAsDefault)}
        />
      </View>
      {/* Owns the trip to system settings itself, so "Not now" is genuinely
          not now — leaveNow and change still arm, biased early. */}
      <NotificationsExactAlarmSheet
        visible={exactSheetVisible}
        onClose={() => setExactSheetVisible(false)}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.lg, gap: space.lg },
  row: { gap: space.sm },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowLabel: { flex: 1, gap: 2 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingLeft: 48 },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  testSent: { paddingLeft: 48 },
  preciseNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
  },
  divider: { height: StyleSheet.hairlineWidth },
});
