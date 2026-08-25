import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { personaHubDefaults } from '@/lib/persona-defaults';

describe('personaHubDefaults', () => {
  it('floats selected interests to the top of module order', () => {
    const { moduleOrderKeys } = personaHubDefaults('tourist', ['trails', 'events']);
    assert.deepEqual(moduleOrderKeys.slice(0, 2), ['trails', 'events']);
  });

  it('builds tourist pins from interests then type defaults', () => {
    const { pinnedKeys } = personaHubDefaults('tourist', ['trails', 'events']);
    assert.ok(pinnedKeys.includes('trails'));
    assert.ok(pinnedKeys.includes('events'));
    assert.ok(pinnedKeys.includes('weather'));
    assert.equal(pinnedKeys.length, 4);
  });

  it('uses resident defaults when no interests are selected', () => {
    const { pinnedKeys } = personaHubDefaults('resident', []);
    assert.deepEqual(pinnedKeys, ['transit', 'minibus', 'traffic', 'news']);
  });

  it('caps pins at four modules', () => {
    const { pinnedKeys } = personaHubDefaults('newcomer', [
      'transit',
      'marketplace',
      'news',
      'events',
      'weather',
    ]);
    assert.equal(pinnedKeys.length, 4);
  });
});
