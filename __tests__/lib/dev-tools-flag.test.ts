import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { devToolsEnabled, setDevToolsAdmin } from '@/lib/dev-tools-flag';

// Release-build conditions: __DEV__ is false, so only the admin half can open
// the gate. Guarded so the assertions hold under the node runner too, where
// the global is simply absent.
(globalThis as Record<string, unknown>).__DEV__ = false;

afterEach(() => {
  setDevToolsAdmin(false);
});

describe('devToolsEnabled', () => {
  it('stays closed for a signed-out release build', () => {
    assert.equal(devToolsEnabled(), false);
  });

  it('opens once the auth store reports a superuser', () => {
    setDevToolsAdmin(true);
    assert.equal(devToolsEnabled(), true);
  });

  it('closes again when that account signs out', () => {
    setDevToolsAdmin(true);
    setDevToolsAdmin(false);
    assert.equal(devToolsEnabled(), false);
  });

  it('opens in a dev build regardless of the account', () => {
    (globalThis as Record<string, unknown>).__DEV__ = true;
    try {
      assert.equal(devToolsEnabled(), true);
    } finally {
      (globalThis as Record<string, unknown>).__DEV__ = false;
    }
  });
});
