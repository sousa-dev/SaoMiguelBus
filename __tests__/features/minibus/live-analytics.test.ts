import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  liveFilterProperties,
  liveFleetBarActionFromHeader,
  liveNavigateViewLineProperties,
  liveSelectStopProperties,
  liveSelectStopSequenceProperties,
  liveSelectVehicleProperties,
} from '@/features/minibus/lib/live-analytics-props';

describe('live-analytics property builders', () => {
  it('builds live filter properties with optional source', () => {
    assert.deepEqual(liveFilterProperties('line-a', 'deep_link'), {
      line_slug: 'line-a',
      source: 'deep_link',
    });
    assert.deepEqual(liveFilterProperties(null), { line_slug: 'all' });
  });

  it('builds live select properties with source', () => {
    assert.deepEqual(liveSelectVehicleProperties('bus-1', 'fleet_bar'), {
      vehicle_id: 'bus-1',
      source: 'fleet_bar',
    });
    assert.deepEqual(liveSelectStopProperties('stop-key', 'map'), {
      stop_key: 'stop-key',
      source: 'map',
    });
    assert.deepEqual(liveSelectStopSequenceProperties(3, 'vehicle_sheet'), {
      stop_sequence: 3,
      source: 'vehicle_sheet',
    });
  });

  it('builds live navigate properties', () => {
    assert.deepEqual(liveNavigateViewLineProperties('line-b'), {
      action: 'view_line',
      line_slug: 'line-b',
      source: 'stop_sheet',
    });
  });

  it('maps fleet bar header presses to actions', () => {
    assert.equal(liveFleetBarActionFromHeader(true, false), 'collapse');
    assert.equal(liveFleetBarActionFromHeader(false, true), 'clear_vehicle');
    assert.equal(liveFleetBarActionFromHeader(false, false), 'expand');
  });
});
