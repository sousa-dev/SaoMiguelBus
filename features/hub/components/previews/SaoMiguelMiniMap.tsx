import { useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { HubMiniMapFrame } from '@/features/hub/components/previews/HubMiniMapFrame';
import { PulsingMarker } from '@/features/hub/components/previews/PulsingMarker';
import { saoMiguelLocatorMap } from '@/features/hub/map-assets';
import { projectToMapUnits, SAO_MIGUEL_MAP_INSET } from '@/features/hub/map-insets';
import { projectToUnit, regionForSaoMiguel, type MapPoint } from '@/lib/azores-map-projection';

type SaoMiguelMiniMapProps = {
  points: MapPoint[];
  color: string;
  height?: number;
};

const MARKER_CAP = 16;
const INTENSITY_FULL_AT = 8;
const OVERLAY_VB = 100;

export function SaoMiguelMiniMap({ points, color, height = 72 }: SaoMiguelMiniMapProps) {
  const reducedMotion = useReducedMotion();
  const region = useMemo(() => regionForSaoMiguel(), []);
  const intensity = Math.min(points.length / INTENSITY_FULL_AT, 1);

  const dots = useMemo(() => {
    return points
      .map((p) => {
        const { x, y } = projectToUnit(p.latitude, p.longitude, region);
        const { x: nx, y: ny } = projectToMapUnits(x, y, SAO_MIGUEL_MAP_INSET);
        return {
          cx: nx * OVERLAY_VB,
          cy: ny * OVERLAY_VB,
        };
      })
      .slice(0, MARKER_CAP);
  }, [points, region]);

  return (
    <HubMiniMapFrame
      height={height}
      imageSource={saoMiguelLocatorMap}
      overlay={
        <Svg width="100%" height="100%" viewBox={`0 0 ${OVERLAY_VB} ${OVERLAY_VB}`} preserveAspectRatio="xMidYMid slice">
          {dots.map((d, i) => (
            <PulsingMarker
              key={i}
              cx={d.cx}
              cy={d.cy}
              r={3.2}
              color={color}
              intensity={intensity}
              animate={!reducedMotion}
            />
          ))}
        </Svg>
      }
    />
  );
}
