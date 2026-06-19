import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { radius, space, typography } from '@/lib/tokens';
import type { MinibusJourney } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

type Props = {
  journey: MinibusJourney;
};

type Step = {
  key: string;
  label: string;
  detail: string;
  accent?: string;
};

function buildSteps(journey: MinibusJourney, t: (key: string, opts?: Record<string, unknown>) => string): Step[] {
  const steps: Step[] = [];
  let stepNumber = 0;

  journey.legs.forEach((leg, legIndex) => {
    if (legIndex > 0) {
      const transfer = journey.transfer_stops[legIndex - 1];
      stepNumber += 1;
      steps.push({
        key: `transfer-${legIndex}`,
        label: `${stepNumber}. ${t('minibusStepTransfer')}`,
        detail: t('minibusTransferAt', { stop: transfer?.name ?? leg.board.name }),
      });
    }

    stepNumber += 1;
    steps.push({
      key: `board-${leg.line_code}-${leg.board.key}`,
      label: `${stepNumber}. ${t('minibusStepBoard')}`,
      detail: t('minibusStepBoardDetail', {
        stop: leg.board.name,
        line: leg.line_name ?? leg.line_code,
      }),
      accent: leg.line_color ?? undefined,
    });

    if (leg.num_stops > 2) {
      stepNumber += 1;
      steps.push({
        key: `ride-${leg.line_code}-${leg.board.key}`,
        label: `${stepNumber}. ${t('minibusStepRide')}`,
        detail: t('minibusStopsCount', { count: leg.num_stops - 1 }),
        accent: leg.line_color ?? undefined,
      });
    }

    stepNumber += 1;
    steps.push({
      key: `alight-${leg.line_code}-${leg.alight.key}`,
      label: `${stepNumber}. ${t('minibusStepAlight')}`,
      detail: t('minibusStepAlightDetail', {
        stop: leg.alight.name,
        line: leg.line_name ?? leg.line_code,
      }),
      accent: leg.line_color ?? undefined,
    });
  });

  return steps;
}

export function MinibusDirectionsSteps({ journey }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const steps = buildSteps(journey, t);

  return (
    <View style={styles.wrap}>
      {steps.map((step) => (
        <View key={step.key} style={[styles.row, { borderColor: theme.outline }]}>
          <View
            style={[
              styles.bullet,
              { backgroundColor: step.accent ?? theme.surfaceVariant },
            ]}
          />
          <View style={styles.body}>
            <Text style={[typography.label, { color: theme.text }]}>{step.label}</Text>
            <Text style={[typography.body, { color: theme.muted }]}>{step.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: {
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bullet: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    marginTop: 6,
  },
  body: { flex: 1, gap: 2 },
});
