---
title: "Missing i18n keys — raw key strings rendering on screen"
issue: 1
severity: high
repo: SaoMiguelBus
files:
  - locales/*.json
  - app/(tabs)/transit/stop/[stopId].tsx
  - components/AppHeaderActions.tsx
  - lib/i18n.ts
---

# 1 — `transitStopDeparturesFrom` and friends render as raw keys

## Symptom

The stop page shows the literal string `transitStopDeparturesFrom` where the
"departures from HH:MM" caption should be.

## Root cause

i18next renders the **key itself** when a key is missing from both the active
locale and the fallback. `lib/i18n.ts:19` sets `FALLBACK_LOCALE = 'pt'`, so a
key missing only from `de`/`es`/`fr`/`it`/`uk`/`zh` renders in Portuguese — ugly
but readable. A key missing from **`pt` as well** renders as the key.

Three keys are used in code and exist in **no** catalogue at all:

| Key | Used at | Renders as |
|-----|---------|-----------|
| `transitStopDeparturesFrom` | [app/(tabs)/transit/stop/[stopId].tsx:268](../../../app/(tabs)/transit/stop/[stopId].tsx#L268) | the raw key |
| `transitStopNoMoreDeparturesToday` | [app/(tabs)/transit/stop/[stopId].tsx:272](../../../app/(tabs)/transit/stop/[stopId].tsx#L272) | the raw key |
| `transitHeaderMoreOptions` | [components/AppHeaderActions.tsx:118](../../../components/AppHeaderActions.tsx#L118) | `"More options"` — it passes `defaultValue`, so this one is cosmetic only (an English string for every locale, on an `accessibilityLabel`) |

Both stop-page keys were added with the AzoresBus stop screen; neither was ever
written into `locales/pt.json`.

## The wider parity gap

Audited across all eight catalogues (`locales/*.json`, key sets compared against
`en.json`, plural `_one`/`_other` variants folded together):

| Locale | Keys | Missing vs `en` |
|--------|------|-----------------|
| `pt` | 1350 | 0 |
| `en` | 1350 | 0 |
| `de`, `es`, `fr`, `it`, `uk`, `zh` | 1297 each | **53 each** |

The 53 are the same set in every non-`pt`/`en` locale, and they are two features
that shipped without a translation pass:

- `appUpdate*` — 6 keys (`appUpdateConfirm`, `appUpdateLater`,
  `appUpdateOptionalTitle`/`Body`, `appUpdateRequiredTitle`/`Body`).
- `minibusLive*` — 47 keys (the whole PDL Mini Bus live-tracking surface).

These do **not** render as raw keys — they fall back to Portuguese. A German
user tracking a minibus gets a Portuguese UI, which is a translation bug rather
than a broken screen. `locales/patches/` does not cover them either: the patch
files are an input to `scripts/apply-locale-patches.mjs`, not a runtime layer,
and none of the 53 appears in any patch file.

## Fix

### Required

Add the two stop-page keys to **all eight** catalogues. Portuguese and English
copy, for reference:

```jsonc
// pt.json
"transitStopDeparturesFrom": "Partidas a partir das {{time}}",
"transitStopNoMoreDeparturesToday": "Sem mais partidas hoje",

// en.json
"transitStopDeparturesFrom": "Departures from {{time}}",
"transitStopNoMoreDeparturesToday": "No more departures today",
```

`{{time}}` arrives already formatted as `HH:MM` (the screen calls
`start.replace('h', ':')` at line 268) — do not add formatting in the string.

### Also do

- Translate the 53 `appUpdate*` / `minibusLive*` keys into `de`, `es`, `fr`,
  `it`, `uk`, `zh`. They can go through `locales/patches/{lang}.json` +
  `node scripts/apply-locale-patches.mjs`, which is what that script exists for.
- Give `transitHeaderMoreOptions` a real key in all eight and drop the
  `defaultValue` from the call site, so the pattern does not spread.

### Guard so it cannot regress

There is no test asserting locale parity today (`__tests__/` has no locale
test). Add one to `__tests__/lib/` — it runs under the existing
`npm run test:unit`:

```ts
// __tests__/lib/locale-parity.test.ts — sketch
// 1. every t('key') literal found in app/ components/ features/ lib/
//    resolves in pt.json (directly or as `${key}_one` / `${key}_other`)
// 2. every locale in resources has the same key set as pt.json
```

Rule (1) is the one that catches this bug class — a key missing from `pt` is the
only way a raw key reaches the screen. Rule (2) catches the silent
Portuguese-fallback class. Ship (1) as a hard failure; (2) can start as a
failure with the current 53 listed as a shrinking allowlist if translating them
all blocks the release.

## Verification

- Open a stop page (Transit → tap a stop, or a **Next Departures** row) in each
  language and confirm the caption above the departure list reads as prose.
- Open it after the last bus of the day and confirm the empty-state line reads
  as prose rather than `transitStopNoMoreDeparturesToday`.
