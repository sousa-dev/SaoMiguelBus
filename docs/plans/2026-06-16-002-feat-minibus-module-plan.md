---
title: "feat: PDL Mini Bus module (transit-linked)"
status: draft
date: 2026-06-16
type: feat
depth: standard
target_repos:
  - SaoMiguelBus
  - SaoMiguelBus-api
revalidated: 2026-06-16
---

# feat: PDL Mini Bus module (transit-linked)

> Canonical plan content lives in Cursor plan `mini_bus_module_16c8df07.plan.md` and is duplicated here for repo discoverability. **Revalidated 2026-06-16** against current migration chain.

**Target repos:** `SaoMiguelBus-api` + `SaoMiguelBus`

---

## Summary

Read-only Mini Bus module for Ponta Delgada (lines A–D): structured metadata + tariffs + in-app PDF/SVG from `docs/minibus/`, attribution to [pdlminibus.pt](https://pdlminibus.pt), linked from Buses (transit). Stop-by-stop timetable OCR deferred.

---

## Database and migration readiness (critical)

### Run pending migrations first (U0)

Before adding `minibus`, apply existing head migrations:

| App | Latest pending (local dev was behind) |
|-----|---------------------------------------|
| `tenancy` | through `0012_sync_sao_miguel_locales` |
| `weather` | through `0002_seed_parishes_and_beat` |

```bash
cd SaoMiguelBus-api/src && python manage.py migrate
```

### Feature-flag migration: use `0013`, not `0012`

`tenancy/migrations/0012_sync_sao_miguel_locales.py` already exists (8-locale sync). Minibus flag migration must be:

**`tenancy/migrations/0013_enable_minibus_feature_flag.py`** → depends on `0012`.

### Media serving: API file stream, not `/media/`

`MEDIA_ROOT`/`MEDIA_URL` exist and Docker mounts `media_files`, but **`src/urls.py` does not serve `/media/`**. Plan PDF/SVG delivery via:

**`GET /api/v3/minibus/documents/{slug}/file`** (FileResponse)

JSON responses expose `file_url` pointing at this API path. WebView allowlists `{API_BASE}/api/v3/minibus/documents/`.

### Source files

7 assets git-tracked in `SaoMiguelBus/docs/minibus/`. Copy into `SaoMiguelBus-api/src/minibus/data/source/` during U2; `import_minibus` copies to `MEDIA_ROOT/minibus/`.

### Locales

App + island DB now ship 8 locales (`pt`, `en`, `de`, `es`, `fr`, `it`, `uk`, `zh`). Minibus i18n covers all 8.

### Analytics

No DB migration — `AnalyticsEvent.module` is a free string; use `track('minibus', …)`.

---

## Key decisions

| Topic | Decision |
|-------|----------|
| Module | Separate `minibus` hub module, UX-linked from `transit` |
| Structured data | ORM + `0002_seed_catalog` from JSON (weather pattern) |
| Binaries | `import_minibus` command after migrate |
| PDF URLs | API file endpoint (not raw media URL) |
| URL wiring | `if 'minibus' in settings.INSTALLED_APPS` in `urls.py` |
| V1 scope | Metadata + PDFs; no stop/time OCR |

---

## Implementation units

| ID | Unit |
|----|------|
| U0 | Apply pending tenancy/weather migrations |
| U1 | `minibus` app, models, `catalog_sao_miguel.json`, `0001` + `0002_seed_catalog` |
| U2 | `import_minibus` → `MEDIA_ROOT`, `MinibusImportMeta`, copy `data/source/` |
| U3 | v3 API + file stream, settings toggle, `MODULE_KEYS`, **`0013`** flag migration, AGENTS.md |
| U4 | Expo hub/tabs, hooks, 8-locale i18n, attribution footer |
| U5 | WebView PDF viewer (API URLs) + SVG screen |
| U6 | Transit promo card, profile link, SDD § |

---

## Deploy checklist

```bash
cd SaoMiguelBus-api/src
python manage.py migrate          # includes 0013 when shipped
python manage.py import_minibus   # copies PDFs/SVG into media
python manage.py test minibus
```

---

## Deferred

- Stop-by-stop timetable transcription / OCR
- O-D search within Mini Bus network
- Live vehicle tracking
- Auto-sync from pdlminibus.pt
