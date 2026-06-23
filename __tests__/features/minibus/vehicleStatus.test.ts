import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatVehicleStatusLabel,
  normalizeVehicleStatus,
} from '@/features/minibus/lib/vehicleStatus';

const t = (key: string) =>
  (
    {
      minibusLiveVehicleStatusIncomingAt: 'Approaching stop',
      minibusLiveVehicleStatusIdleAt: 'At stop',
      minibusLiveVehicleStatusInTransitTo: 'En route',
      minibusLiveVehicleStatusOnTime: 'On time',
      minibusLiveVehicleStatusDelayed: 'Delayed',
      minibusLiveVehicleStatusUnknown: 'Unknown',
    } as Record<string, string>
  )[key] ?? key;

describe('normalizeVehicleStatus', () => {
  it('maps upstream camelCase statuses', () => {
    assert.equal(normalizeVehicleStatus('incomingAt'), 'incomingAt');
    assert.equal(normalizeVehicleStatus('idleAt'), 'idleAt');
    assert.equal(normalizeVehicleStatus('inTransitTo'), 'inTransitTo');
    assert.equal(normalizeVehicleStatus('ontime'), 'ontime');
  });

  it('maps GTFS-style snake and SCREAMING values', () => {
    assert.equal(normalizeVehicleStatus('INCOMING_AT'), 'incomingAt');
    assert.equal(normalizeVehicleStatus('STOPPED_AT'), 'idleAt');
    assert.equal(normalizeVehicleStatus('in_transit_to'), 'inTransitTo');
  });
});

describe('formatVehicleStatusLabel', () => {
  it('returns localized labels for known statuses', () => {
    assert.equal(formatVehicleStatusLabel('incomingAt', t), 'Approaching stop');
    assert.equal(formatVehicleStatusLabel('idleAt', t), 'At stop');
    assert.equal(formatVehicleStatusLabel('inTransitTo', t), 'En route');
    assert.equal(formatVehicleStatusLabel('ontime', t), 'On time');
  });

  it('humanizes unknown upstream values', () => {
    assert.equal(formatVehicleStatusLabel('someNewStatus', t), 'Some new status');
  });
});
