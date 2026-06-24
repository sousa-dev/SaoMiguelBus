import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fleetVehicleListSubtitle } from '@/features/minibus/lib/fleetVehicleListSubtitle';
import type { MinibusVehicleDetail, MinibusVehicleSummary } from '@/lib/types';

const t = (key: string, options?: Record<string, string | number>) => {
  const map: Record<string, string> = {
    minibusLiveFleetAtStop: `At ${options?.stop}`,
    minibusLiveFleetApproachingStop: `Approaching ${options?.stop}`,
    minibusLiveVehicleStatusInTransitToStop: `En route to ${options?.stop}`,
    minibusLiveFleetId: `Fleet ${options?.id}`,
    minibusLiveVehicleStatusOnTime: 'On time',
  };
  return map[key] ?? key;
};

const vehicle: MinibusVehicleSummary = {
  id: '1',
  position: { lat: 0, lon: 0 },
  status: 'ontime',
};

const detail: MinibusVehicleDetail = {
  ...vehicle,
  currentStopSequence: 4,
  journey: {
    circulations: [
      {
        sequence: 4,
        stage: { name: 'PRAÇA VASCO DA GAMA', nameShort: 'B 04' },
      },
    ],
  },
};

describe('fleetVehicleListSubtitle', () => {
  it('shows current stop name instead of on-time status', () => {
    assert.equal(fleetVehicleListSubtitle(vehicle, detail, t), 'Praça Vasco da Gama');
  });

  it('labels idleAt with at-stop copy', () => {
    assert.equal(
      fleetVehicleListSubtitle({ ...vehicle, status: 'idleAt' }, detail, t),
      'At Praça Vasco da Gama',
    );
  });

  it('falls back to fleet id without detail', () => {
    assert.equal(
      fleetVehicleListSubtitle({ ...vehicle, fleetId: '42' }, undefined, t),
      'Fleet 42',
    );
  });
});
