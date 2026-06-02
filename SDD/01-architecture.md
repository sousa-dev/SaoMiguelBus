# SDD 01 — System Architecture & Tech Stack

## 1. High-level architecture

Azores Hub is a **modular monolith backend** + a **single cross-platform client**. We deliberately avoid microservices: the modules share tenancy, auth, analytics, consent, and billing infrastructure, and the volume does not justify the operational cost of many services.

```
Expo app (RN + Web)  ──HTTPS/JSON──▶  djast Django backend (DRF)  ──▶ PostgreSQL
   │  Android / iOS / Web                  │  flat Django apps in src/   (tenant-scoped)
   │  theme + i18n by ISLAND_KEY           │  Celery workers ──▶ Redis (broker + cache)
   └─ consent (CMP) before any analytics   └─ external integrations (EMSC, dados.gov.pt, RSS, Maps)
```

## 2. Backend tech stack

| Concern | Choice | Notes |
|---------|--------|-------|
| Framework | **Django 5** via **djast** starter | Replaces Django 3.0.14 in `legacy/` |
| Starter | [`SaoMiguelBus-api/boilerplate/`](../../SaoMiguelBus-api/boilerplate/) → promoted to API repo root | See §3 |
| API | Django REST Framework — `api.py` + `serializers.py` + `urls.py` (generics; ViewSets where useful) | Replaces legacy `@api_view` function views |
| DB | PostgreSQL (prod); SQLite (dev) | Same pattern as boilerplate + legacy |
| Async/cron | **Celery + Celery Beat**, Redis broker | News scraping, EMSC/trails sync, retention jobs, push fan-out |
| Cache | Redis | Bootstrap payloads, GMaps proxy cache, rate-limit counters |
| Auth | **django-allauth** (Google/GitHub OAuth) + **django-axes** + DRF token; anonymous read paths | Extends boilerplate `user_management`; see [`11-security-auth.md`](./11-security-auth.md) |
| Storage | Object storage (S3-compatible) + CDN | Provider/event media, offline map tiles |
| Search/matching | Postgres `pg_trgm` for fuzzy stop/place names | Replaces ad-hoc `cleaned_name` `__contains` |
| Payments | Boilerplate **`stripe_payments`** + RevenueCat (mobile IAP) | See [`08-monetization-freemium.md`](./08-monetization-freemium.md) |
| Observability | Structured logging, Sentry, request/Celery metrics | — |

### What the djast boilerplate provides (concrete, not assumed)

The vendored starter at `SaoMiguelBus-api/boilerplate/` already ships:

| Capability | Boilerplate location |
|------------|-------------------|
| Feature toggles (`apps` list → INSTALLED_APPS/urls) | `src/src/settings.py` |
| DRF + CORS | `rest_framework`, `corsheaders` toggles |
| allauth + Google/GitHub OAuth | `user_management`, social providers |
| Brute-force protection | `axes` |
| Stripe Checkout + webhooks | `stripe_payments` (`services.py` pattern) |
| Celery + Beat (DB scheduler) | `src/src/celery.py`, `django_celery_beat` |
| Redis cache (prod) / in-memory (dev) | `REDIS_URL`, `CELERY_BROKER_URL` |
| Legal pages (JSON-driven) | `legal/` |
| Docs engine | `documentation/` |
| Agent conventions | `.cursor/`, `CLAUDE.md`, `.agentic/`, per-app `AGENT_INSTRUCTIONS.md` |
| Service layer pattern | `<app>/services.py`; thin `views.py` / `api.py` |
| Docker Compose (web + worker + beat + postgres + redis) | `docker-compose.yml` |

Azores Hub **adds** flat domain apps (`tenancy`, `transit`, `analytics`, …) via the same toggle mechanism ([boilerplate doc: adding an app](https://github.com/sousa-dev/djast/blob/main/src/documentation/docs/6_customization/2_adding_an_app.md)).

**Default toggles for SMB:** disable boilerplate `app`, `free_tools`, `landing_page`; keep `stripe_payments`, `legal`, `user_management`, `documentation`, `shared`, `theme`; optional `blog` (SEO / news overlap).

## 3. Backend project layout (`SaoMiguelBus-api/` on `revamp`)

New backend is built by **promoting** `boilerplate/` to the repo root. Legacy stays in `legacy/`. SDD lives in `SaoMiguelBus/SDD/`.

```
SaoMiguelBus-api/                    # revamp branch
├── legacy/                          # Django 3.0 — frozen, compat reference + ETL source
│   ├── src/                         # legacy manage.py, db.sqlite3, data.json
│   └── scripts/                     # csv/, groups.json — operator timetable fallbacks
├── boilerplate/                     # vendored djast copy (reference until promoted)
├── src/                             # Django project root (run all manage.py here)
│   ├── manage.py
│   ├── run.py                       # dev: Django + Tailwind
│   ├── requirements.txt
│   ├── src/                         # settings package (not "config/")
│   │   ├── settings.py              # feature toggles + env
│   │   ├── urls.py
│   │   ├── celery.py
│   │   └── .env.example
│   ├── shared/                      # cross-app utilities (from boilerplate)
│   ├── user_management/             # allauth wrappers (→ accounts)
│   ├── stripe_payments/             # Stripe (→ billing webhooks)
│   ├── legal/                       # privacy/terms JSON pages
│   ├── documentation/               # in-app handbook
│   ├── theme/                       # Tailwind
│   ├── tenancy/                     # Island, TenantScopedModel, middleware
│   ├── transit/                     # Operator, Line, Stop, Trip, StopTime, …
│   ├── analytics/                   # AnalyticsEvent, ingestion
│   ├── consent/                     # ConsentRecord, DSAR commands
│   ├── billing/                     # Entitlement, RevenueCat, Promotion (extends stripe_payments)
│   ├── news/                        # NewsSource, NewsArticle, RSS tasks
│   ├── seismic/                     # SeismicEvent, FeltReport
│   ├── marketplace/
│   ├── trails/
│   ├── traffic/
│   ├── events/
│   └── compat/                      # Legacy /api/v1 + /api/v2 shim
├── setup.py
├── docker-compose.yml
├── Dockerfile
├── AGENTS.md
└── README.md
```

Each domain app follows djast conventions:

```
<app>/
├── models.py
├── services.py          # business logic
├── serializers.py       # if API
├── api.py               # DRF generics (preferred over fat views.py)
├── urls.py
├── tasks.py             # Celery @shared_task
├── admin.py
├── migrations/
├── tests/
└── management/commands/ # e.g. migrate_legacy_stops
```

Register new apps in `src/src/settings.py`:

```python
apps = [
    # ... boilerplate entries ...
    ('tenancy', True),
    ('transit', True),
    ('analytics', True),
    # ...
]
```

## 4. Frontend tech stack

| Concern | Choice |
|---------|--------|
| Framework | **Expo (React Native)** with **Expo Router** (file-based routing) |
| Targets | Android, iOS, Web (`react-native-web`) from one codebase |
| Language | TypeScript |
| State/data | TanStack Query (server cache) + lightweight client store (Zustand) |
| Styling/theme | Theme tokens from island config; no hardcoded brand colors |
| i18n | port the 8 existing locales (`pt,en,es,de,fr,it,uk,zh`) into a typed i18n lib |
| Maps | `react-native-maps` (native) + Leaflet/MapLibre (web); offline tiles via MapLibre + cached MBTiles |
| Push | Expo Notifications |
| Payments | Stripe web SDK + RevenueCat SDK (mobile) |

Frontend layout and routing: [`10-frontend-architecture.md`](./10-frontend-architecture.md).

## 5. Repository strategy

| Repo | Role |
|------|------|
| **`SaoMiguelBus-api`** (`revamp`) | djast-based backend at root; `legacy/` for old API + migration source; `boilerplate/` as starter reference |
| **`SaoMiguelBus`** | Mobile app (Expo) + **`SDD/`** (this doc set) |
| **`SaoMiguelBus-webapp`** | Legacy PWA — deprecated after client cutover |

Per-island instances are **deployments of the same API + client repos**, differentiated by env (`EXPO_PUBLIC_ISLAND_KEY`, `X-Island`) and tenant data — not repo forks.

OpenAPI types for the Expo app are generated from the new backend schema (single contract source).

## 6. Environments & config

| Env | Backend | Frontend |
|-----|---------|----------|
| dev | SQLite (`DEBUG=True`), Celery eager optional, fake external feeds | Expo dev client, `EXPO_PUBLIC_API_URL` → `http://127.0.0.1:8000` |
| staging | Postgres, real Celery; **`staging.api.saomiguelbus.com`** — revamp compat validation | Same as prod hostname in webapp; point DNS or override for testing |
| prod | Postgres, Redis, real feeds & billing; **`api.saomiguelbus.com`** → revamp after DNS cutover | Web PWA hardcodes `https://api.saomiguelbus.com`; per-island EAS build |

Secrets and toggles: `src/src/.env` (see `src/src/.env.example`). Run dev with `cd src && python run.py`.

**Critical fix vs legacy:** API base URL is `EXPO_PUBLIC_API_URL`, not hardcoded `https://api.saomiguelbus.com`.

## 7. Cross-cutting infrastructure

- **Tenancy** ([`02`](./02-multi-island-whitelabel.md)) — `tenancy` middleware resolves `Island` from `X-Island` / subdomain.
- **Analytics** ([`06`](./06-analytics-tracking.md)) — `analytics` app, one ingestion endpoint, consent-gated.
- **Consent & governance** ([`07`](./07-gdpr-data-governance.md)) — `consent` app + boilerplate `legal` pages.
- **Billing** ([`08`](./08-monetization-freemium.md)) — `billing` + `stripe_payments`, RevenueCat webhooks.

## 8. Non-functional requirements

- **Performance:** bootstrap payload (`/api/v3/bootstrap`) cached in Redis per island; transit search < 200 ms server-side (legacy target).
- **Offline:** transit schedule + trails + last-known news cached client-side; offline map tiles for trails.
- **Availability:** strangler-fig dual-run keeps `legacy/` as fallback during migration.
- **Portability:** zero island-specific code paths; everything tenant-driven.
