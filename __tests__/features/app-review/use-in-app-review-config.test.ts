import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveInAppReviewConfig } from '@/features/app-review/lib/in-app-review-config';

describe('resolveInAppReviewConfig', () => {
  it('returns disabled when bootstrap field is absent or false', () => {
    assert.deepEqual(resolveInAppReviewConfig(undefined), { enabled: false, storeUrls: undefined });
    assert.deepEqual(resolveInAppReviewConfig({ inAppReviewEnabled: false } as never), {
      enabled: false,
      storeUrls: undefined,
    });
  });

  it('returns enabled when bootstrap flag is true', () => {
    assert.deepEqual(
      resolveInAppReviewConfig({
        inAppReviewEnabled: true,
        storeUrls: { ios: 'https://ios', android: 'https://android' },
      } as never),
      {
        enabled: true,
        storeUrls: { ios: 'https://ios', android: 'https://android' },
      },
    );
  });
});
