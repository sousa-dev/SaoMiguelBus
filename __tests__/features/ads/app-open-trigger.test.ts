import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  APP_OPEN_LAUNCH_GRACE_MS,
  shouldTreatAsForegroundReturn,
} from '@/features/ads/lib/app-open-trigger';

const settled = APP_OPEN_LAUNCH_GRACE_MS + 1;

describe('shouldTreatAsForegroundReturn', () => {
  it('allows a genuine return from background', () => {
    assert.equal(
      shouldTreatAsForegroundReturn({
        wasBackgrounded: true,
        nextState: 'active',
        msSinceLaunch: settled,
      }),
      true,
    );
  });

  it('ignores anything that is not becoming active', () => {
    for (const nextState of ['background', 'inactive'] as const) {
      assert.equal(
        shouldTreatAsForegroundReturn({
          wasBackgrounded: true,
          nextState,
          msSinceLaunch: settled,
        }),
        false,
      );
    }
  });

  // iOS shows the ATT prompt and the UMP consent form as system modals: the app
  // goes active -> inactive -> active without ever reaching 'background'.
  // Treating that as a foreground return puts a full-screen ad on the user's
  // screen seconds after a cold start.
  it('ignores an inactive blip that never reached background', () => {
    assert.equal(
      shouldTreatAsForegroundReturn({
        wasBackgrounded: false,
        nextState: 'active',
        msSinceLaunch: settled,
      }),
      false,
    );
  });

  // Android can report 'background' while the launch activity is still
  // resuming, which would otherwise look like a foreground return on cold start.
  it('ignores a background blip during the launch grace window', () => {
    assert.equal(
      shouldTreatAsForegroundReturn({
        wasBackgrounded: true,
        nextState: 'active',
        msSinceLaunch: APP_OPEN_LAUNCH_GRACE_MS - 1,
      }),
      false,
    );
  });

  it('treats the grace boundary as still launching', () => {
    assert.equal(
      shouldTreatAsForegroundReturn({
        wasBackgrounded: true,
        nextState: 'active',
        msSinceLaunch: APP_OPEN_LAUNCH_GRACE_MS,
      }),
      false,
    );
  });
});
