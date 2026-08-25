/**
 * Notification copy (09 §4).
 *
 * The failure this suite exists to prevent is quiet: a mistyped key does not
 * throw, it ships as a blank line on a lock screen, and nobody finds out until a
 * rider says the notification was empty. So every key `content.ts` can emit is
 * asserted against the real `locales/en.json` rather than against a list
 * maintained here, and every placeholder the catalogue expects is asserted
 * against the params the planner actually supplies.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { alarmContent } from '@/lib/notifications/content';
import type { PlannedAlarm } from '@/lib/notifications/plan';

const localesDir = join(process.cwd(), 'locales');

function loadLocale(lang: string): Record<string, string> {
  return JSON.parse(readFileSync(join(localesDir, `${lang}.json`), 'utf8')) as Record<string, string>;
}

const en = loadLocale('en');

/** `{{stop}}` → `stop`, in the order they appear. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)].map((m) => m[1]);
}

function alarm(type: PlannedAlarm['type'], params: PlannedAlarm['params']): PlannedAlarm {
  return { type, at: new Date(2026, 8, 2, 8, 0), legIndex: 0, params };
}

/** One of every alarm the planner can emit, with the params it really supplies. */
const SAMPLES: { label: string; alarm: PlannedAlarm }[] = [
  {
    label: 'leaveNow',
    alarm: alarm('leaveNow', { route: '25', stop: 'Ponta Delgada', minutes: 10 }),
  },
  {
    label: 'change (plain)',
    alarm: alarm('change', { route: '310', stop: 'Lagoa', minutes: 5, tight: false }),
  },
  {
    label: 'change (tight)',
    alarm: alarm('change', { route: '310', stop: 'Lagoa', minutes: 5, tight: true }),
  },
  { label: 'alight', alarm: alarm('alight', { stop: 'Furnas' }) },
  { label: 'complete', alarm: alarm('complete', { stop: 'Furnas' }) },
];

describe('alarmContent — keys resolve', () => {
  for (const { label, alarm: sample } of SAMPLES) {
    it(`${label} maps to keys that exist in locales/en.json`, () => {
      const { titleKey, bodyKey } = alarmContent(sample);
      assert.ok(titleKey in en, `${titleKey} missing from en.json — would ship as a blank line`);
      assert.ok(bodyKey in en, `${bodyKey} missing from en.json — would ship as a blank line`);
      assert.ok(en[titleKey].length > 0);
      assert.ok(en[bodyKey].length > 0);
    });
  }
});

describe('alarmContent — the tight-change variant', () => {
  it('selects the tight keys when the transfer is tight', () => {
    const content = alarmContent(alarm('change', { route: '310', stop: 'Lagoa', minutes: 5, tight: true }));
    assert.equal(content.titleKey, 'notificationChangeTightTitle');
    assert.equal(content.bodyKey, 'notificationChangeTightBody');
  });

  it('selects the plain keys when it is not', () => {
    const content = alarmContent(alarm('change', { route: '310', stop: 'Lagoa', minutes: 5, tight: false }));
    assert.equal(content.titleKey, 'notificationChangeTitle');
    assert.equal(content.bodyKey, 'notificationChangeBody');
  });

  it('treats a missing tight flag as not tight, rather than throwing', () => {
    const content = alarmContent(alarm('change', { route: '310', stop: 'Lagoa', minutes: 5 }));
    assert.equal(content.bodyKey, 'notificationChangeBody');
  });
});

describe('alarmContent — params', () => {
  for (const { label, alarm: sample } of SAMPLES) {
    it(`${label} supplies every placeholder its English copy asks for`, () => {
      const { titleKey, bodyKey, params } = alarmContent(sample);
      const wanted = [...placeholders(en[titleKey]), ...placeholders(en[bodyKey])];
      for (const name of wanted) {
        assert.ok(
          name in params,
          `${bodyKey} interpolates {{${name}}} but the planner supplies ${JSON.stringify(
            Object.keys(params),
          )}`,
        );
      }
    });
  }

  /**
   * `count` is what i18next resolves plurals against, and every locale here
   * abbreviates the minute unit invariantly — the convention `trackStatusMinutes`
   * already follows (07 §2 rule 4). Using `count` would silently switch on
   * pluralisation and start missing `_one`/`_other` forms nobody wrote.
   */
  it('interpolates minute counts as `minutes`, never `count`', () => {
    for (const { alarm: sample } of SAMPLES) {
      const { params } = alarmContent(sample);
      assert.ok(!('count' in params), '`count` triggers i18next pluralisation');
    }
    assert.equal(alarmContent(SAMPLES[0].alarm).params.minutes, 10);
  });

  it('strips the tight selector — it chose the key, it is not interpolated', () => {
    const { params } = alarmContent(alarm('change', { route: '310', stop: 'Lagoa', minutes: 5, tight: true }));
    assert.ok(!('tight' in params));
  });
});

/**
 * The 07 §8 checklist item, as a test rather than a box someone ticks: a
 * translator renaming `{{stop}}` to `{{paragem}}` leaves the placeholder
 * unresolved and prints the braces verbatim on a lock screen.
 */
describe('notification copy — placeholders survive translation', () => {
  const NOTIFICATION_KEYS = [...new Set(SAMPLES.flatMap((s) => {
    const { titleKey, bodyKey } = alarmContent(s.alarm);
    return [titleKey, bodyKey];
  }))];

  const langs = readdirSync(localesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''));

  for (const lang of langs) {
    it(`${lang} keeps the same placeholder set as en`, () => {
      const locale = loadLocale(lang);
      for (const key of NOTIFICATION_KEYS) {
        assert.ok(key in locale, `${key} missing from ${lang}.json`);
        assert.deepEqual(
          [...placeholders(locale[key])].sort(),
          [...placeholders(en[key])].sort(),
          `${lang}.json ${key} renamed or dropped a placeholder`,
        );
      }
    });
  }
});
