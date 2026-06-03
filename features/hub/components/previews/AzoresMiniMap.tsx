import { useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { AzoresMapBackground } from '@/features/hub/components/previews/AzoresMapBackground';
import { HubMiniMapFrame } from '@/features/hub/components/previews/HubMiniMapFrame';
import { PulsingMarker } from '@/features/hub/components/previews/PulsingMarker';
import {
  AZORES_MAP_INSET,
  AZORES_MAP_VIEWBOX,
  projectToMapUnits,
} from '@/features/hub/map-insets';
import { projectToUnit, regionForPreview, type MapPoint } from '@/lib/azores-map-projection';
import { magnitudeColor } from '@/lib/seismic-colors';
import { useAppTheme } from '@/lib/theme';

type AzoresMiniMapProps = {
  points: MapPoint[];
  magnitudes?: number[];
  height?: number;
};

const MARKER_CAP = 16;
const INTENSITY_FULL_AT = 10;

export function AzoresMiniMap({ points, magnitudes, height = 72 }: AzoresMiniMapProps) {
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const region = useMemo(() => regionForPreview(points), [points]);
  const intensity = Math.min(points.length / INTENSITY_FULL_AT, 1);
  const { width: vbW, height: vbH } = AZORES_MAP_VIEWBOX;

  const dots = useMemo(() => {
    const mapped = points.map((p, i) => {
      const { x, y } = projectToUnit(p.latitude, p.longitude, region);
      const { x: nx, y: ny } = projectToMapUnits(x, y, AZORES_MAP_INSET);
      const mag = magnitudes?.[i] ?? 2;
      return {
        cx: nx * vbW,
        cy: ny * vbH,
        fill: magnitudeColor(theme, mag),
        r: mag >= 4 ? 5 : mag >= 3 ? 4 : 3,
        mag,
      };
    });
    return mapped.sort((a, b) => b.mag - a.mag).slice(0, MARKER_CAP);
  }, [points, magnitudes, region, theme]);

  return (
    <HubMiniMapFrame
      height={height}
      vectorBackground={<AzoresMapBackground />}
      overlay={
        <Svg width="100%" height="100%" viewBox={`0 0 ${vbW} ${vbH}`} preserveAspectRatio="xMidYMid slice">
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
