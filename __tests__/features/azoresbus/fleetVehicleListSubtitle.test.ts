import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { azoresbusFleetVehicleListSubtitle } from '@/features/azoresbus/lib/fleetVehicleListSubtitle';

const PT: Record<string, string> = {
  azoresbusLiveVehicleStatusIncomingAt: 'A chegar à paragem',
  azoresbusLiveVehicleStatusIdleAt: 'Na paragem',
  azoresbusLiveVehicleStatusInTransitTo: 'A caminho',
  azoresbusLiveVehicleStatusOnTime: 'A horas',
  azoresbusLiveVehicleStatusDelayed: 'Com atraso',
  azoresbusLiveVehicleStatusUnknown: 'Estado desconhecido',
  azoresbusLiveRouteUnknown: 'Linha desconhecida',
};

const t = (key: string) => PT[key] ?? key;

const route = { id: '7', nameShort: '110', name: 'Ponta Delgada - Furnas', color: '2D59A9' };

describe('azoresbusFleetVehicleListSubtitle', () => {
  it('reports the MOVEMENT state, not the punctuality', () => {
    // The regression test for the bug this whole field exists to prevent: the
    // list endpoint puts punctuality in `status`, so a subtitle built from it
    // says "A horas" for a bus that is actually sitting at the stop.
    const subtitle = azoresbusFleetVehicleListSubtitle(
      { busStatus: 'idleAt', route, delay: 0 },
      t,
    );
    assert.match(subtitle, /Na paragem/);
    assert.doesNotMatch(subtitle, /A horas/);
  });

  it('names the line alongside the movement state', () => {
    assert.equal(
      azoresbusFleetVehicleListSubtitle({ busStatus: 'incomingAt', route, delay: 0 }, t),
      'A chegar à paragem · Ponta Delgada - Furnas',
    );
  });

  it('falls back to the line name when the movement state is unusable', () => {
    assert.equal(
      azoresbusFleetVehicleListSubtitle({ busStatus: '', route, delay: 0 }, t),
      'Ponta Delgada - Furnas',
    );
  });

  it('still says something for a bus with no line and no status', () => {
    // Both can be true at once while the route index is warming up.
    assert.equal(
      azoresbusFleetVehicleListSubtitle({ busStatus: '', route: null, delay: null }, t),
      'Linha desconhecida',
    );
  });
});
