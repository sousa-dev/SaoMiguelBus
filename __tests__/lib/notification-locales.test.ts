/**
 * Locale coverage for the whole notification feature (07 §8).
 *
 * `locale-parity.test.ts` already proves the eight catalogues have identical key
 * SETS. What it cannot see is the two failure modes specific to this feature,
 * both of which ship silently:
 *
 *  1. A translator renames or drops a `{{placeholder}}`, and the braces print
 *     verbatim on a lock screen.
 *  2. A translation runs long enough that Android truncates it in the collapsed
 *     notification — where the truncated half is usually the half carrying the
 *     stop name.
 *
 * This turns the manual checklist in 07 §8 into something CI enforces.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const localesDir = join(process.cwd(), 'locales');
const LANGS = readdirSync(localesDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace('.json', ''));

function load(lang: string): Record<string, string> {
  return JSON.parse(readFileSync(join(localesDir, `${lang}.json`), 'utf8')) as Record<string, string>;
}

const en = load('en');

/** Every key this feature introduced. */
const FEATURE_KEYS = Object.keys(en).filter((key) => /^notifications?[A-Z]/.test(key));

/**
 * The subset that lands on a lock screen, where length actually bites. In-app
 * copy wraps; a collapsed Android notification does not.
 */
const LOCK_SCREEN_TITLE_KEYS = FEATURE_KEYS.filter((k) => /^notification[A-Z].*Title$/.test(k));
const LOCK_SCREEN_BODY_KEYS = FEATURE_KEYS.filter((k) => /^notification[A-Z].*Body$/.test(k));

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)].map((m) => m[1]).sort();
}

describe('notification copy — coverage', () => {
  it('introduced a non-trivial number of keys, so the filter is not silently empty', () => {
    assert.ok(FEATURE_KEYS.length >= 40, `expected ~40+ keys, found ${FEATURE_KEYS.length}`);
    assert.ok(LOCK_SCREEN_TITLE_KEYS.length >= 5);
    assert.ok(LOCK_SCREEN_BODY_KEYS.length >= 5);
  });

  it('ships all eight locales', () => {
    assert.equal(LANGS.length, 8, `expected 8 catalogues, found ${LANGS.join(', ')}`);
  });

  for (const lang of LANGS) {
    it(`${lang} has every notification key, non-empty`, () => {
      const locale = load(lang);
      const missing = FEATURE_KEYS.filter((key) => !(key in locale));
      assert.deepEqual(missing, [], `${lang}.json is missing: ${missing.join(', ')}`);

      const blank = FEATURE_KEYS.filter((key) => !locale[key]?.trim());
      assert.deepEqual(blank, [], `${lang}.json has empty values for: ${blank.join(', ')}`);
    });

    it(`${lang} keeps every placeholder unrenamed`, () => {
      const locale = load(lang);
      for (const key of FEATURE_KEYS) {
        assert.deepEqual(
          placeholders(locale[key]),
          placeholders(en[key]),
          `${lang}.json "${key}" — placeholders differ from en`,
        );
      }
    });

    it(`${lang} never interpolates a minute count as {{count}}`, () => {
      // `count` is what i18next resolves plurals against, and every locale here
      // abbreviates the minute unit invariantly (07 §2 rule 4).
      const locale = load(lang);
      for (const key of FEATURE_KEYS) {
        assert.ok(
          !placeholders(locale[key]).includes('count'),
          `${lang}.json "${key}" uses {{count}}, which triggers pluralisation`,
        );
      }
    });
  }
});

describe('notification copy — lock-screen length (07 §2 rule 1)', () => {
  // Android truncates collapsed notifications hard, and German and Ukrainian run
  // long, so the English has to leave headroom rather than sit at the limit.
  const TITLE_LIMIT = 40;
  const BODY_LIMIT = 120;

  for (const lang of LANGS) {
    it(`${lang} titles stay within ${TITLE_LIMIT} characters`, () => {
      const locale = load(lang);
      const over = LOCK_SCREEN_TITLE_KEYS.filter((key) => locale[key].length > TITLE_LIMIT).map(
        (key) => `${key} (${locale[key].length})`,
      );
      assert.deepEqual(over, [], `${lang}.json titles too long: ${over.join(', ')}`);
    });

    it(`${lang} bodies stay within ${BODY_LIMIT} characters`, () => {
      const locale = load(lang);
      const over = LOCK_SCREEN_BODY_KEYS.filter((key) => locale[key].length > BODY_LIMIT).map(
        (key) => `${key} (${locale[key].length})`,
      );
      assert.deepEqual(over, [], `${lang}.json bodies too long: ${over.join(', ')}`);
    });
  }
});

describe('notification copy — no marketing (11 §I1.1)', () => {
  /**
   * A hard rule, not a preference: a rider grants notification permission for
   * bus alerts, and the moment one arrives selling something they revoke it —
   * and revocation is effectively permanent. One promotional notification costs
   * the alarm channel for that rider forever.
   */
  const SELLING = /premium|subscri|upgrade|assinatura|abonnement|suscrip|abbonamento|підпис|订阅|高级/i;

  for (const lang of LANGS) {
    it(`${lang} lock-screen copy contains no upsell`, () => {
      const locale = load(lang);
      for (const key of [...LOCK_SCREEN_TITLE_KEYS, ...LOCK_SCREEN_BODY_KEYS]) {
        assert.ok(
          !SELLING.test(locale[key]),
          `${lang}.json "${key}" reads like marketing: ${locale[key]}`,
        );
      }
    });
  }
});
