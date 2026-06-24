import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldShowAppUpdatePrompt } from '@/features/app-update/lib/should-show-update-prompt';

describe('shouldShowAppUpdatePrompt', () => {
  it('returns false when no update is required', () => {
    assert.equal(
      shouldShowAppUpdatePrompt({
        updateRequired: false,
        currentVersion: '5.2.0',
        dismissedVersion: null,
      }),
      false,
    );
  });

  it('returns false for optional updates dismissed for the same current version this session', () => {
    assert.equal(
      shouldShowAppUpdatePrompt({
        updateRequired: true,
        updateMode: 'optional',
        currentVersion: '5.2.0',
        dismissedVersion: '5.2.0',
      }),
      false,
    );
  });

  it('returns true for optional updates when the API version changed', () => {
    assert.equal(
      shouldShowAppUpdatePrompt({
        updateRequired: true,
        updateMode: 'optional',
        currentVersion: '5.3.0',
        dismissedVersion: '5.2.0',
      }),
      true,
    );
  });

  it('returns true for required updates even when dismissed', () => {
    assert.equal(
      shouldShowAppUpdatePrompt({
        updateRequired: true,
        updateMode: 'required',
        currentVersion: '5.2.0',
        dismissedVersion: '5.2.0',
      }),
      true,
    );
  });
});
