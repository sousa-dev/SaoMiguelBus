/**
 * The Test buttons (settings row + one per alarm type in the preference sheet).
 *
 * The failure worth guarding is embarrassing rather than dangerous: a preview
 * that omits a param renders `{{route}}` verbatim on the rider's lock screen, on
 * the one notification whose entire job is to look right. So every type is
 * checked against the real `en.json` copy it will be rendered with.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { alarmContent } from '@/lib/notifications/content';
import { previewAlarm, type PreviewSource } from '@/lib/notifications/preview';
import type { AlarmType } from '@/lib/notifications/types';

const en = JSON.parse(readFileSync(join(process.cwd(), 'locales', 'en.json'), 'utf8')) as Record<
  string,
  string
>;

const NOW = new Date(2026, 8, 2, 8, 0, 0);
const TYPES: AlarmType[] = ['leaveNow', 'change', 'alight', 'complete'];

const GENERIC: PreviewSource = {
  fallbackStop: 'the town centre',
  fallbackRoute: '1',
};

const BORROWED: PreviewSource = {
  ...GENERIC,
  routeNumber: '25',
  boardStop: 'Ponta Delgada',
  alightStop: 'Furnas',
  leadMinutes: 30,
};

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)].map((m) => m[1]);
}

describe('previewAlarm — every type renders completely', () => {
  for (const type of TYPES) {
    it(`${type} supplies every placeholder its English copy needs`, () => {
      const { titleKey, bodyKey, params } = alarmContent(previewAlarm(type, BORROWED, NOW));
      for (const name of [...placeholders(en[titleKey]), ...placeholders(en[bodyKey])]) {
        assert.ok(
          name in params,
          `${bodyKey} interpolates {{${name}}} but the preview supplies ${JSON.stringify(
            Object.keys(params),
          )}`,
        );
      }
    });

    it(`${type} renders completely from the generic fallback too`, () => {
      const { titleKey, bodyKey, params } = alarmContent(previewAlarm(type, GENERIC, NOW));
      for (const name of [...placeholders(en[titleKey]), ...placeholders(en[bodyKey])]) {
        assert.ok(name in params, `${bodyKey} would print {{${name}}} verbatim`);
      }
    });
  }
});

describe('previewAlarm — what it borrows', () => {
  it('prefers the rider’s own route and boarding stop', () => {
    const alarm = previewAlarm('leaveNow', BORROWED, NOW);
    assert.equal(alarm.params.route, '25');
    assert.equal(alarm.params.stop, 'Ponta Delgada');
    assert.equal(alarm.params.minutes, 30, 'shows the lead time currently on screen');
  });

  it('names the destination, not the origin, for alight and complete', () => {
    assert.equal(previewAlarm('alight', BORROWED, NOW).params.stop, 'Furnas');
    assert.equal(previewAlarm('complete', BORROWED, NOW).params.stop, 'Furnas');
  });

  /**
   * The app is white-labelled by `islandKey`, so the fallback must never be a
   * real São Miguel place name — it would simply be wrong on another island.
   */
  it('falls back to the translated generic when the rider has no journey', () => {
    const alarm = previewAlarm('leaveNow', GENERIC, NOW);
    assert.equal(alarm.params.stop, 'the town centre');
    assert.equal(alarm.params.route, '1');
  });

  it('treats blank borrowed values as absent rather than rendering an empty stop', () => {
    const blank: PreviewSource = { ...GENERIC, routeNumber: '   ', boardStop: '' };
    const alarm = previewAlarm('leaveNow', blank, NOW);
    assert.equal(alarm.params.route, '1');
    assert.equal(alarm.params.stop, 'the town centre');
  });

  it('defaults the minute count to 0 rather than undefined', () => {
    assert.equal(previewAlarm('leaveNow', GENERIC, NOW).params.minutes, 0);
  });
});

describe('previewAlarm — a test must not look like an emergency', () => {
  /**
   * The tight-change variant exists for the one moment the paid feature earns
   * its subscription. A preview firing that wording would be crying wolf.
   */
  it('never selects the tight-change copy', () => {
    const alarm = previewAlarm('change', BORROWED, NOW);
    assert.equal(alarm.params.tight, false);
    assert.equal(alarmContent(alarm).bodyKey, 'notificationChangeBody');
    assert.notEqual(alarmContent(alarm).bodyKey, 'notificationChangeTightBody');
  });

  it('carries no upsell in the copy it will render', () => {
    for (const type of TYPES) {
      const { titleKey, bodyKey } = alarmContent(previewAlarm(type, BORROWED, NOW));
      assert.ok(!/premium|subscri/i.test(en[titleKey] + en[bodyKey]));
    }
  });
});
