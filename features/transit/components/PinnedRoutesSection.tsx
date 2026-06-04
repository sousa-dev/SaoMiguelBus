import { Pin, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { TransitCollapsibleSection } from '@/features/transit/components/TransitCollapsibleSection';
import { useBusTracking } from '@/features/transit/hooks/useBusTracking';
import { usePremium } from '@/lib/premium-store';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  onSelect: (origin: string, destination: string) => void;
};

export function PinnedRoutesSection({ onSelect }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isPremium = usePremium();
  const { pinned, unpinRoute } = useBusTracking();

  // Webapp parity: pinned routes are a premium-only widget.
  if (!isPremium || pinned.length === 0) {
    return null;
  }

  return (
    <TransitCollapsibleSection
      icon={<Pin size={16} color={theme.onInfo} />}
      iconBackground={theme.info}
      title={t('transitPinnedRoutes')}
      subtitle={t('pinnedRoutesSubtitle')}
      countLabel={String(pinned.length)}
      countBackground={theme.infoSurface}
      countColor={theme.info}
      defaultOpen={false}
    >
      {pinned.map((pin) => (
        <View
          key={pin.id}
          style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
        >
          <View style={styles.header}>
            <Pressable style={{ flex: 1 }} onPress={() => onSelect(pin.origin, pin.destination)}>
              <Text style={[typography.headline, { color: theme.text }]}>{pin.routeNumber}</Text>
              <Text style={[typography.body, { color: theme.muted }]}>
                {pin.origin} → {pin.destination}
              </Text>
            </Pressable>
            <IconButton
              icon={X}
              variant="ghost"
              size="sm"
              color={theme.muted}
              accessibilityLabel={t('transitUnpinRoute')}
              onPress={() => unpinRoute(pin.id)}
            />
          </View>
        </View>
      ))}
    </TransitCollapsibleSection>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: space.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
