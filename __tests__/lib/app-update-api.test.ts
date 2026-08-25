import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildAppUpdateCheckPath } from '@/lib/app-update-api';

describe('buildAppUpdateCheckPath', () => {
  it('builds the v3 update-check query string', () => {
    assert.equal(
      buildAppUpdateCheckPath({ platform: 'ios', version: '5.1.6' }),
      '/api/v3/app/update-check?platform=ios&version=5.1.6',
    );
  });

  it('encodes android platform and version values', () => {
    assert.equal(
      buildAppUpdateCheckPath({ platform: 'android', version: '5.0.0' }),
      '/api/v3/app/update-check?platform=android&version=5.0.0',
    );
  });
});
