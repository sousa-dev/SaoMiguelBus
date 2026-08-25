import { WifiOff } from 'lucide-react-native';
import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import { useNetwork } from '@/lib/network-provider';

type RequiresInternetProps = {
  children: ReactNode;
  /** Caption shown beneath the blocked content. Defaults to a generic message. */
  message?: string;
  /** Hide the caption (just grey-out and disable). */
  hideMessage?: boolean;
  style?: ViewStyle;
};

/**
 * Canonical offline-blocked affordance for touch UIs: when offline, the wrapped
 * action is greyed out, made non-interactive, hidden from assistive tech, and
 * annotated with a short caption explaining why.
 */
export function RequiresInternet({ children, message, hideMessage, style }: RequiresInternetProps) {
  const { isOnline } = useNetwork();
  const theme = useAppTheme();
  const { t } = useTranslation();

  if (isOnline) {
    return <>{children}</>;
  }

  return (
    <View style={style}>
      <View
        pointerEvents="none"
        style={styles.disabled}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {children}
      </View>
      {hideMessage ? null : (
        <View style={styles.caption} accessibilityRole="text">
          <WifiOff size={14} color={theme.muted} strokeWidth={2} />
          <Text style={[typography.caption, { color: theme.muted }]}>
            {message ?? t('offlineRequiresInternet')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.4 },
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    marginTop: space.xs,
  },
});
