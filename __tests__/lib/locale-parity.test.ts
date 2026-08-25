import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, it } from 'node:test';

// Matches `t('key')` / `t("key")` / `` t(`key`) `` — a literal, static first
// argument only. Dynamic keys (`t(variable)`, `t(obj.labelKey)`) are out of
// scope: they cannot be resolved by static analysis and are not what this
// bug class is about (see docs/azoresbus/found-bugs/01-missing-i18n-keys.md).
const T_CALL_PATTERN = /(?<![A-Za-z0-9_.$])t\(\s*(['"`])([A-Za-z][A-Za-z0-9_]*)\1/g;

const SOURCE_DIRS = ['app', 'components', 'features', 'lib'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(path));
    } else if (SOURCE_EXTENSIONS.has(extname(entry))) {
      files.push(path);
    }
  }
  return files;
}

function collectTranslationKeys(files: string[]): Map<string, string[]> {
  const usages = new Map<string, string[]>();
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    for (const match of content.matchAll(T_CALL_PATTERN)) {
      const key = match[2];
      const existing = usages.get(key);
      if (existing) {
        existing.push(file);
      } else {
        usages.set(key, [file]);
      }
    }
  }
  return usages;
}

const localesDir = join(process.cwd(), 'locales');
const FALLBACK_LOCALE = 'pt';

function loadLocale(lang: string): Record<string, string> {
  return JSON.parse(readFileSync(join(localesDir, `${lang}.json`), 'utf8')) as Record<
    string,
    string
  >;
}

function resolvesInLocale(key: string, locale: Record<string, string>): boolean {
  return key in locale || `${key}_one` in locale || `${key}_other` in locale;
}

describe('locale parity', () => {
  it('every literal t(key) call resolves in the fallback locale (pt)', () => {
    const files = SOURCE_DIRS.flatMap((dir) => collectSourceFiles(dir));
    const usages = collectTranslationKeys(files);
    const fallback = loadLocale(FALLBACK_LOCALE);

    const missing: string[] = [];
    for (const [key, usedIn] of usages) {
      if (!resolvesInLocale(key, fallback)) {
        missing.push(`"${key}" (used in ${usedIn.join(', ')})`);
      }
    }

    assert.equal(
      missing.length,
      0,
      `Keys missing from locales/${FALLBACK_LOCALE}.json — these render as the raw key ` +
        `on screen since it is the i18next fallback locale:\n${missing.join('\n')}`,
    );
  });

  it('every locale has the same key set as pt.json', () => {
    const pt = loadLocale(FALLBACK_LOCALE);
    const ptKeys = new Set(Object.keys(pt));
    const localeFiles = readdirSync(localesDir).filter((file) => file.endsWith('.json'));

    for (const file of localeFiles) {
      const lang = file.replace('.json', '');
      if (lang === FALLBACK_LOCALE) {
        continue;
      }
      const locale = loadLocale(lang);
      const localeKeys = new Set(Object.keys(locale));

      const missing = [...ptKeys].filter((key) => !localeKeys.has(key));
      const extra = [...localeKeys].filter((key) => !ptKeys.has(key));

      assert.deepEqual(
        missing,
        [],
        `locales/${file} is missing keys present in pt.json: ${missing.join(', ')}`,
      );
      assert.deepEqual(
        extra,
        [],
        `locales/${file} has keys not present in pt.json: ${extra.join(', ')}`,
      );
    }
  });
});
