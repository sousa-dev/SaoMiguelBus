import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { liveFleetBarTitle } from '@/features/minibus/lib/liveFleetBarTitle';

const t = (key: string, options?: Record<string, string | number>) => {
  const map: Record<string, string> = {
    minibusLiveFleetBarTitle: `Autocarros em serviço (${options?.count})`,
    minibusLiveFleetBarTitleFiltered: `Autocarros em serviço na Linha ${options?.line} (${options?.count})`,
  };
  return map[key] ?? key;
};

describe('liveFleetBarTitle', () => {
  it('uses the default title when no line filter is active', () => {
    assert.equal(liveFleetBarTitle(t, 5, null), 'Autocarros em serviço (5)');
  });

  it('names the filtered line in the title', () => {
    assert.equal(liveFleetBarTitle(t, 2, 'A'), 'Autocarros em serviço na Linha A (2)');
  });
});
