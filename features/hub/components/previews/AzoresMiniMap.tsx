import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { projectToUnit, regionForPreview, type MapPoint } from '@/lib/azores-map-projection';
import { magnitudeColor } from '@/lib/seismic-colors';
import { radius, space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type AzoresMiniMapProps = {
  points: MapPoint[];
  magnitudes?: number[];
  height?: number;
};

const PAD = 0.08;

export function AzoresMiniMap({ points, magnitudes, height = 72 }: AzoresMiniMapProps) {
  const theme = useAppTheme();
  const region = useMemo(() => regionForPreview(points), [points]);

  const dots = useMemo(() => {
    return points.map((p, i) => {
      const { x, y } = projectToUnit(p.latitude, p.longitude, region);
      const mag = magnitudes?.[i] ?? 2;
      return {
        cx: (PAD + x * (1 - 2 * PAD)) * 100,
        cy: (PAD + y * (1 - 2 * PAD)) * 100,
        fill: magnitudeColor(theme, mag),
        r: mag >= 4 ? 4.5 : mag >= 3 ? 3.5 : 2.5,
      };
    });
  }, [points, magnitudes, region, theme]);

  return (
    <View
      style={[
        styles.wrap,
        {
          height,
          backgroundColor: theme.surfaceSunken,
          borderRadius: radius.md,
        },
      ]}
      accessibilityElementsHidden
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet">
        <Rect
          x={12}
          y={18}
          width={18}
          height={14}
          rx={3}
          fill={theme.divider}
          opacity={0.55}
        />
        <Rect
          x={34}
          y={12}
          width={22}
          height={20}
          rx={4}
          fill={theme.divider}
          opacity={0.7}
        />
        <Rect
          x={58}
          y={16}
          width={16}
          height={12}
          rx={3}
          fill={theme.divider}
          opacity={0.5}
        />
        <Rect
          x={72}
          y={22}
          width={14}
          height={10}
          rx={2}
          fill={theme.divider}
          opacity={0.45}
        />
        <Rect
          x={20}
          y={34}
          width={20}
          height={16}
          rx={4}
          fill={theme.divider}
          opacity={0.65}
        />
        {dots.map((d, i) => (
          <Circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.fill} opacity={0.95} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    marginBottom: space.sm,
  },
});
