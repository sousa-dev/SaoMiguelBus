import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createNativeSplashHideGuard,
  createSplashDismissGuard,
  resolveSplashTheme,
} from '@/features/splash/branded-splash-theme';

describe('resolveSplashTheme', () => {
  it('returns brand primary green for light scheme', () => {
    const theme = resolveSplashTheme('light');
    assert.equal(theme.background, '#218732');
    assert.equal(theme.text, '#ffffff');
  });

  it('returns dark splash palette for dark scheme', () => {
    const theme = resolveSplashTheme('dark');
    assert.equal(theme.background, '#0f1a12');
    assert.equal(theme.text, '#f5f5f5');
  });

  it('defaults to light palette when scheme is null', () => {
    const theme = resolveSplashTheme(null);
    assert.equal(theme.background, '#218732');
  });
});

describe('createSplashDismissGuard', () => {
  it('marks dismissed only once', () => {
    const guard = createSplashDismissGuard();
    assert.equal(guard.isDismissed(), false);
    assert.equal(guard.dismiss(), true);
    assert.equal(guard.isDismissed(), true);
    assert.equal(guard.dismiss(), false);
  });
});

describe('createNativeSplashHideGuard', () => {
  it('allows hide only once', () => {
    const guard = createNativeSplashHideGuard();
    assert.equal(guard.shouldHide(), true);
    guard.markHidden();
    assert.equal(guard.shouldHide(), false);
  });
});
