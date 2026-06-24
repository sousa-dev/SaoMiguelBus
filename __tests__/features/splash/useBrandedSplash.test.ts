import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSplashOverlayVisible } from '@/features/splash/useBrandedSplash';

describe('resolveSplashOverlayVisible', () => {
  it('waits for fonts before showing the overlay', () => {
    assert.equal(
      resolveSplashOverlayVisible({
        fontsLoaded: false,
        splashDismissed: false,
        devPreviewVisible: false,
      }),
      false,
    );
  });

  it('shows the overlay until the launch splash is dismissed', () => {
    assert.equal(
      resolveSplashOverlayVisible({
        fontsLoaded: true,
        splashDismissed: false,
        devPreviewVisible: false,
      }),
      true,
    );
  });

  it('can show a dev preview after the launch splash was dismissed', () => {
    assert.equal(
      resolveSplashOverlayVisible({
        fontsLoaded: true,
        splashDismissed: true,
        devPreviewVisible: true,
      }),
      true,
    );
  });
});
