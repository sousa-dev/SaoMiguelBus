import { Radio, WifiOff } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { RequiresInternet } from '@/components/RequiresInternet';
import { Card } from '@/components/ui/Card';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type AzoresbusLiveHubCardProps = {
  enabled: boolean;
  onPress: () => void;
};

/**
 * The "Ao vivo" entry on the transit tab, directly under the network-map link.
 *
 * Mirrors `MinibusLiveHubCard` but carries NO bottom margin: this sits inside
 * `TransitWebShell`, whose column already supplies `gap: space.md`, so the
 * minibus margin would double the spacing against its neighbours.
 */
export function AzoresbusLiveHubCard({ enabled, onPress }: AzoresbusLiveHubCardProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <RequiresInternet hideMessage>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !enabled }}
        accessibilityLabel={
          enabled
            ? t('azoresbusLiveCta')
            : `${t('azoresbusLiveCta')}. ${t('azoresbusLiveOfflineHint')}`
        }
        onPress={() => {
          if (!enabled) {
            return;
          }
          onPress();
        }}
      >
        <Card style={styles.card}>
          <View style={[styles.icon, { backgroundColor: theme.accent }]}>
            {enabled ? (
              <Radio size={iconSize.md} color={theme.onAccent} strokeWidth={2} />
            ) : (
              <WifiOff size={iconSize.md} color={theme.onAccent} strokeWidth={2} />
            )}
          </View>
          <View style={styles.body}>
            <Text style={[typography.headline, { color: theme.text }]}>
              {t('azoresbusLiveCta')}
            </Text>
            <Text style={[typography.caption, { color: theme.muted }]}>
              {enabled ? t('azoresbusLiveCtaHint') : t('azoresbusLiveOfflineHint')}
            </Text>
          </View>
        </Card>
      </Pressable>
    </RequiresInternet>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
});
