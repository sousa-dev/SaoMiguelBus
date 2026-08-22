/**
 * The third action in the row, beside track and pin.
 *
 * **A separate button, not a change to Track (KTD8).** Folding alarms into
 * tracking is simpler and is the wrong call: a subscriber who has tracked
 * journeys for months would, on update, start getting phone alerts they never
 * asked for — that arrives as a one-star review, not as a feature. It would also
 * turn `useAutoTrackPinnedRoutes`, which deliberately starts up to four tracks a
 * day in silence, into an automatic notification generator. And the OS
 * permission prompt needs an honest trigger: "you tapped a bell" is one, "you
 * tapped the thing you have always tapped" is not.
 *
 * Arming the bell DOES start a track — there is no coherent alarm on an
 * untracked journey — but never the reverse.
 *
 * Presentation only; the flow lives in `useNotifyBell` so both action rows
 * behave identically. The sheets render here rather than beside the notice
 * because they are `Modal`s and their position in the tree does not affect where
 * they appear.
 */

import { Bell, BellOff, BellRing } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { NotificationPrefsSheet } from '@/features/transit/components/NotificationPrefsSheet';
import { NotificationsBlockedSheet } from '@/features/transit/components/NotificationsBlockedSheet';
import type { NotifyBellState } from '@/features/transit/hooks/useNotifyBell';
import { useNotificationUiStore } from '@/lib/notifications/ui-store';
import { useAppTheme } from '@/lib/theme';

export function NotifyBellButton({ state }: { state: NotifyBellState }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  // `BellOff` rather than `Bell` while blocked, so the icon itself says the app
  // cannot do this right now instead of inviting a tap that leads nowhere.
  const blocked = useNotificationUiStore((s) => s.permissionRevoked);

  const icon = state.armed ? BellRing : blocked ? BellOff : Bell;

  return (
    <>
      <IconButton
        icon={icon}
        variant={state.armed ? 'filled' : 'tonal'}
        color={state.armed ? theme.primary : theme.muted}
        accessibilityLabel={t(
          state.armed ? 'notificationsStopNotifying' : 'notificationsNotifyJourney',
        )}
        onPress={state.onPress}
      />
      <NotificationPrefsSheet
        visible={state.sheetVisible}
        mode="journey"
        initial={state.initialPrefs}
        showChange={state.hasTransfers}
        onClose={state.closeSheet}
        onConfirm={state.onConfirm}
        previewTrack={state.previewTrack}
        onTestBlocked={state.openBlockedSheet}
      />
      <NotificationsBlockedSheet
        visible={state.blockedVisible}
        onClose={state.closeBlocked}
        onOpenSettings={state.onOpenSettings}
      />
    </>
  );
}
