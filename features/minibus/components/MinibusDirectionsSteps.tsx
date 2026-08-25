import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { buildJourneySteps, isJourneyStepHighlighted, type JourneyStep } from '@/features/minibus/journeySteps';
import { onColorFor } from '@/lib/color-utils';
import { radius, space, typography } from '@/lib/tokens';
import type { MinibusJourney } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

type Props = {
  journey: MinibusJourney;
  highlightedStepKey?: string | null;
  onStepPress?: (stepKey: string) => void;
};

function stepBadgeColor(step: JourneyStep, theme: ReturnType<typeof useAppTheme>): string {
  if (step.kind === 'transfer') {
    return '#6366f1';
  }
  return step.accent ?? theme.surfaceVariant;
}

export function MinibusDirectionsSteps({
  journey,
  highlightedStepKey = null,
  onStepPress,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const steps = buildJourneySteps(journey, t);

  return (
    <View style={styles.wrap}>
      {steps.map((step) => {
        const isSelected = isJourneyStepHighlighted(step.key, highlightedStepKey, steps);
        const isPressable = Boolean(onStepPress) && step.kind !== 'ride' && step.coordinate;
        const badgeColor = stepBadgeColor(step, theme);
        const onFill = onColorFor(badgeColor);

        const rowBody = (
          <>
            <Text style={[typography.label, { color: theme.text }]}>{step.label}</Text>
            <Text style={[typography.body, { color: theme.muted }]}>{step.detail}</Text>
          </>
        );

        return (
          <View
            key={step.key}
            style={[
              styles.row,
              { borderColor: theme.outline },
              isSelected && { backgroundColor: theme.surfaceVariant, borderRadius: radius.sm },
            ]}
          >
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: badgeColor,
                  borderColor: isSelected ? theme.text : 'transparent',
                  borderWidth: isSelected ? 2 : 0,
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: onFill }]}>{step.stepNumber}</Text>
            </View>
            <View style={styles.body}>
              {isPressable ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={step.label}
                  onPress={() => onStepPress?.(step.key)}
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  {rowBody}
                </Pressable>
              ) : (
                rowBody
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  row: {
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  badgeText: { fontSize: 12, fontWeight: '800' },
  body: { flex: 1, gap: 2 },
  pressed: { opacity: 0.7 },
});
