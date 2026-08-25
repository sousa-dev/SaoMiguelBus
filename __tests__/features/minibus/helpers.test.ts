import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveMinibusApiLocale } from '@/features/minibus/locale';
import {
  buildMinibusDocumentFileUrl,
  isAllowedMinibusDocumentUrl,
  isValidMinibusDocumentSlug,
} from '@/features/minibus/pdfUrl';
import { formatServiceSummary } from '@/features/minibus/serviceSummary';

test('resolveMinibusApiLocale uses pt only for Portuguese app language', () => {
  assert.equal(resolveMinibusApiLocale('pt'), 'pt');
  assert.equal(resolveMinibusApiLocale('pt-PT'), 'pt');
  assert.equal(resolveMinibusApiLocale('en'), 'en');
  assert.equal(resolveMinibusApiLocale('de'), 'en');
  assert.equal(resolveMinibusApiLocale(undefined), 'pt');
});

test('formatServiceSummary renders weekday and saturday slots', () => {
  const t = (key: string, options?: Record<string, unknown>) => {
    if (key === 'minibusWeekdayHours') {
      return `Weekdays ${options?.start}-${options?.end}`;
    }
    return `Saturdays: ${options?.times}`;
  };

  const text = formatServiceSummary(
    {
      weekday: { start: '07:30', end: '19:30' },
      saturday_departures: ['09:00', '10:00'],
    },
    t,
  );

  assert.match(text, /Weekdays 07:30-19:30/);
  assert.match(text, /Saturdays: 09:00, 10:00/);
});

test('buildMinibusDocumentFileUrl uses app API base', () => {
  process.env.EXPO_PUBLIC_API_URL = 'https://staging.api.saomiguelhub.com';
  assert.equal(
    buildMinibusDocumentFileUrl('line-a'),
    'https://staging.api.saomiguelhub.com/api/v3/minibus/documents/line-a/file',
  );
});

test('isAllowedMinibusDocumentUrl accepts same host with different scheme', () => {
  process.env.EXPO_PUBLIC_API_URL = 'https://staging.api.saomiguelhub.com';
  assert.equal(
    isAllowedMinibusDocumentUrl(
      'http://staging.api.saomiguelhub.com/api/v3/minibus/documents/line-a/file',
    ),
    true,
  );
  assert.equal(isAllowedMinibusDocumentUrl('https://evil.example/line-a/file'), false);
});

test('isValidMinibusDocumentSlug rejects unsafe values', () => {
  assert.equal(isValidMinibusDocumentSlug('line-a'), true);
  assert.equal(isValidMinibusDocumentSlug('network-map'), true);
  assert.equal(isValidMinibusDocumentSlug('../evil'), false);
});
