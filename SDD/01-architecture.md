# SDD 01 — System Architecture & Tech Stack

## 1. High-level architecture

Azores Hub is a **modular monolith backend** + a **single cross-platform client**. We deliberately avoid microservices: the modules share tenancy, auth, analytics, consent, and billing infrastructure, and the volume does not justify the operational cost of many services.

```
Expo app (RN + Web)  ──HTTPS/JSON──▶  djast Django backend (DRF)  ──▶ PostgreSQL
   │  Android / iOS / Web                  │  modular apps              (tenant-scoped)
   │  theme + i18n by ISLAND_KEY           │  Celery workers ──▶ Redis (broker + cache)
   └─ consent (CMP) before any analytics   └─ external integrations (EMSC, dados.gov.pt, RSS, Maps)
```

## 2. Backend tech stack

| Concern | Choice | Notes |
|---------|--------|-------|
| Framework | Django (current LTS) via **`djast`** | Replaces Django 3.0.14 |
| API | Django REST Framework, **ViewSets + Routers** | Replaces ad-hoc `@api_view` function views |
| DB | PostgreSQL | Already used in legacy production |
| Async/cron | **Celery + Celery Beat**, Redis broker | News scraping, EMSC/trails sync, retention jobs, push fan-out |
| Cache | Redis | Bootstrap payloads, external-feed caching, rate-limit counters |
| Auth | djast auth + DRF token/JWT; anonymous-allowed read paths | See [`11-security-auth.md`](./11-security-auth.md) |
| Storage | Object storage (S3-compatible) + CDN | Provider/event media, offline map tiles |
| Search/matching | Postgres `pg_trgm` for fuzzy stop/place names | Replaces ad-hoc `cleaned_name` `__contains` |
| Payments | Stripe (web) + RevenueCat (mobile IAP) | See [`08-monetization-freemium.md`](./08-monetization-freemium.md) |
| Observability | Structured logging, Sentry, request/Celery metrics | — |

### djast assumptions

`djast` is taken to provide: project scaffold, opinionated settings split (`base`/`dev`/`prod`), DRF + CORS wiring, Celery/Redis, a custom `User` model, environment/secret loading, and agent-friendly conventions. Anything we depend on that `djast` may *not* provide is flagged in [`12-risks-open-questions.md`](./12-risks-open-questions.md).

## 3. Backend project layout (`sao-miguel-hub/backend/`)

```
backend/
├── config/                 # djast settings (base/dev/prod), urls, celery, wsgi/asgi
├── apps/
│   ├── tenancy/            # Island/Hub root, scoping middleware, base models
│   ├── accounts/           # User, profiles, consent links
│   ├── analytics/          # AnalyticsEvent, ingestion, retention tasks
│   ├── consent/            # ConsentRecord, CMP support, DSAR commands
│   ├── billing/            # Entitlement, Stripe + RevenueCat webhooks, Promotion
│   ├── transit/            # Operator, Line, Stop, Trip, StopTime, Calendar, directions proxy
│   ├── news/               # NewsSource, NewsArticle, RSS Celery tasks
│   ├── seismic/            # SeismicEvent, FeltReport, EMSC sync
│   ├── marketplace/        # ServiceProvider, ServiceCategory, Review
│   ├── trails/             # Trail, TrailStage, POI; dados.gov.pt sync
│   ├── traffic/            # TrafficReport, confirmations, push
│   ├── events/             # CommunityEvent, ViatorListing
│   └── compat/             # Legacy /api/v1 + /api/v2 shim views
├── common/                 # shared serializers, pagination, permissions, geo utils
└── tests/
```

Each feature app owns its `models.py`, `serializers.py`, `views.py` (ViewSets), `tasks.py` (Celery), `admin.py`, and `migrations/`.

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

`sao-miguel-hub` is a **monorepo** with `backend/` and `app/` (Expo) plus `SDD/` and `infra/`. A monorepo keeps the API contract and client types in sync (shared OpenAPI-generated types) and matches "one platform" framing. Per-island instances are **deployments of the same repo**, differentiated by env/config and tenant data — *not* repo forks.

## 6. Environments & config

| Env | Backend | Frontend |
|-----|---------|----------|
| dev | SQLite or local Postgres, Celery eager, fake external feeds | Expo dev client, `EXPO_PUBLIC_API_URL` → localhost |
| staging | Postgres, real Celery, sandbox Stripe/RevenueCat | points at staging API |
| prod | Postgres, Redis, real feeds & billing | per-island build with island config |

**Critical fix vs legacy:** the API base URL must be an environment variable (`EXPO_PUBLIC_API_URL`), not hardcoded as `https://api.saomiguelbus.com` the way the legacy webapp does it.

## 7. Cross-cutting infrastructure

- **Tenancy** ([`02`](./02-multi-island-whitelabel.md)) — middleware resolves the active `Island` from the `X-Island` header / subdomain and scopes all querysets.
- **Analytics** ([`06`](./06-analytics-tracking.md)) — one ingestion endpoint, one `AnalyticsEvent` table, consent-gated.
- **Consent & governance** ([`07`](./07-gdpr-data-governance.md)) — CMP, pseudonymization, retention, DSAR.
- **Billing** ([`08`](./08-monetization-freemium.md)) — entitlement reconciliation across Stripe + RevenueCat.

## 8. Non-functional requirements

- **Performance:** bootstrap payload (`/bootstrap`) cached in Redis per island; transit search < 200 ms server-side (legacy target).
- **Offline:** transit schedule + trails + last-known news cached client-side; offline map tiles for trails.
- **Availability:** strangler-fig dual-run keeps legacy as fallback during migration.
- **Portability:** zero island-specific code paths; everything tenant-driven.
