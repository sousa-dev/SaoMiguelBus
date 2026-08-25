import { useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { AzoresMapBackground } from '@/features/hub/components/previews/AzoresMapBackground';
import { HubMiniMapFrame } from '@/features/hub/components/previews/HubMiniMapFrame';
import { PulsingMarker } from '@/features/hub/components/previews/PulsingMarker';
import { AZORES_MAP_INSET, projectToMapUnits } from '@/features/hub/map-insets';
import { projectToUnit, type MapPoint } from '@/lib/azores-map-projection';
import { getAzoresArchipelagoRegion } from '@/lib/island-map';
import { magnitudeColor } from '@/lib/seismic-colors';
import { useAppTheme } from '@/lib/theme';

type AzoresMiniMapProps = {
  points: MapPoint[];
  magnitudes?: number[];
  /** When set, all markers use this color (home card accent). Otherwise magnitude tint. */
  color?: string;
  height?: number;
};

const MARKER_CAP = 16;
const INTENSITY_FULL_AT = 10;
/** Normalized overlay space — matches SaoMiguelMiniMap so dot radii stay visible at ~72px height. */
const OVERLAY_VB = 100;

export function AzoresMiniMap({ points, magnitudes, color, height = 72 }: AzoresMiniMapProps) {
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const region = useMemo(() => getAzoresArchipelagoRegion(), []);
  const intensity = Math.min(points.length / INTENSITY_FULL_AT, 1);

  const dots = useMemo(() => {
    const mapped = points.map((p, i) => {
      const { x, y } = projectToUnit(p.latitude, p.longitude, region);
      const { x: nx, y: ny } = projectToMapUnits(x, y, AZORES_MAP_INSET);
      const mag = magnitudes?.[i] ?? 2;
      return {
        cx: nx * OVERLAY_VB,
        cy: ny * OVERLAY_VB,
        fill: color ?? magnitudeColor(theme, mag),
        r: mag >= 4 ? 4.2 : mag >= 3 ? 3.6 : 3.2,
        mag,
      };
    });
    return mapped.sort((a, b) => b.mag - a.mag).slice(0, MARKER_CAP);
  }, [points, magnitudes, region, theme, color]);

  return (
    <HubMiniMapFrame
      height={height}
      vectorBackground={<AzoresMapBackground />}
      overlay={
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${OVERLAY_VB} ${OVERLAY_VB}`}
          preserveAspectRatio="xMidYMid slice"
        >
          {dots.map((d, i) => (
            <PulsingMarker
              key={i}
              cx={d.cx}
              cy={d.cy}
              r={d.r}
              color={d.fill}
              intensity={intensity}
              animate={!reducedMotion}
            />
          ))}
        </Svg>
      }
    />
  );
}
