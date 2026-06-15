import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const PREMIUM_CTA_KEYS = [
  'removeAdsBannerSubtitle',
  'upgradeNowSubtitle',
  'fromPriceText',
  'interstitialAdDescription',
  'removeAdsTitle',
  'upgradeNowButton',
  'continueWithAdsButton',
  'premiumGoPremium',
  'premiumUpsell',
  'clickToRemoveAds',
  'upgradeForBetterTitle',
] as const;

const PRICE_PATTERN = /[€$]|\/week|\/month|\/year|\d+[.,]\d{2}/i;

export function containsHardcodedPrice(text: string): boolean {
  return PRICE_PATTERN.test(text);
}

const localesDir = join(process.cwd(), 'locales');

describe('premium CTA locale strings', () => {
  it('does not contain hardcoded subscription prices', () => {
    const localeFiles = readdirSync(localesDir).filter((file) => file.endsWith('.json'));

    for (const file of localeFiles) {
      const content = JSON.parse(readFileSync(join(localesDir, file), 'utf8')) as Record<
        string,
        string
      >;

      for (const key of PREMIUM_CTA_KEYS) {
        const value = content[key];
        if (value == null) {
          continue;
        }

        assert.equal(
          containsHardcodedPrice(value),
          false,
          `${file} key "${key}" contains a price pattern: ${value}`,
        );
      }
    }
  });

  it('detects hardcoded price patterns', () => {
    assert.equal(containsHardcodedPrice('from €0.99/week'), true);
    assert.equal(containsHardcodedPrice('Ad-free experience'), false);
  });
});
