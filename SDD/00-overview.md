# SDD 00 — Overview, Vision & Scope

## 1. Vision

**Azores Hub** is a white-labelable mobile + web platform that is the daily-utility companion for residents and visitors of an Azorean island. The first instance, **`sao-miguel-hub`**, supersedes the existing São Miguel Bus app. The same codebase and backend must clone to other islands (Terceira, Faial, Pico, …) by configuration and data only.

It expands the product from a single feature (bus schedules) to a multi-module hub:

- Transit (buses, routes, step-by-step directions) — *migrated from legacy*
- Local News
- Earthquake / seismic tracking
- Marketplace for local services
- Tourist guide & hiking trails
- Crowdsourced traffic & navigation alerts
- Crowdsourced community events & tours

## 2. Why now / problem with the legacy stack

| Area | Legacy reality | Consequence |
|------|----------------|-------------|
| Backend framework | Django **3.0.14** (EOL), DRF function-views | Security/maintenance risk; hard to extend |
| Schedule model | `Route.stops` = stringified Python dict (`str(dict)`, not JSON) | Fragile, unqueryable, no relational integrity |
| Multi-tenant | None — single island hardcoded (50 km radius around `37.78,-25.50`) | Cannot scale to other islands |
| Analytics | Single flat `Stat` table; triple client stack (GA + Umami + `/stat`) | Inconsistent, not module-aware, no governance |
| Privacy | Anonymous-ish but no consent flow, no retention policy, IP/UA handling undefined | GDPR exposure |
| Monetization | Manual email allow-list "premium"; Stripe only planned | Not real billing; no IAP |
| Frontend | 2.4k-line `index.html` + global-scoped JS, no build, hardcoded API URL | Unmaintainable, can't reskin, three parallel clients (web, Android, Flutter) |

## 3. Scope

### In scope
- New backend (Django 5 via **djast** starter at `SaoMiguelBus-api/boilerplate/`, promoted to repo root) with tenant root, normalized schema, modular flat apps.
- New Expo (React Native + Web) app replacing webapp + native Android + Flutter clients.
- Migration of all historical data since 2020 (routes, stats, ads, infos, holidays, likes, subscriptions).
- GDPR consent + analytics governance.
- Freemium monetization (subscriptions, ads, pay-to-promote).
- The seven feature modules above.

### Out of scope (for now)
- Real-time GPS bus positions from operators (no operator feed exists today; "tracking" is currently schedule-math only — see [`09-modules.md`](./09-modules.md)).
- Non-Azorean regions.
- Replacing Google Maps as the directions provider.

## 4. Personas

| Persona | Needs |
|---------|-------|
| **Resident commuter** | Fast bus search, favorites, offline schedule, traffic alerts, local news |
| **Tourist** | Trails, POIs, tours (Viator), directions, offline maps, micro-climate weather |
| **Local tradesperson** | Free Marketplace listing; optional paid promotion |
| **Event promoter** | Submit events; pay to boost |
| **Premium subscriber** | Ad-free, GPS alerts, personalized notifications |
| **Operator / admin** | Manage schedules, ads, moderation, analytics |
| **DPO / compliance** | Consent records, retention, DSAR fulfillment |

## 5. Success metrics

- **Parity:** 100% of legacy transit search results reproducible on the new stack (validated against `/api/v2/webapp/load`).
- **Scalability:** spin up a second island with zero code changes (config + data only).
- **Privacy:** zero raw IP / stable-ID storage without consent; retention job demonstrably anonymizes/deletes after the configured window.
- **Engagement:** module-level event coverage — every search/filter/engagement in all 7 modules emits a normalized `AnalyticsEvent`.
- **Revenue:** functional subscribe → ad-free flow on all three platforms; functional pay-to-promote purchase.

## 6. Glossary

| Term | Meaning |
|------|---------|
| **Island / Hub** | Tenant root entity; one row per island instance |
| **`ISLAND_KEY`** | Stable slug identifying the active tenant (e.g. `sao-miguel`) |
| **CMP** | Consent Management Platform (frontend consent UI + backend record) |
| **DSAR** | Data Subject Access Request (GDPR export/delete) |
| **Compat shim** | Adapter exposing new data through legacy `/api/v1` + `/api/v2` shapes |
| **`djast`** | Django 5 SaaS boilerplate vendored at [`SaoMiguelBus-api/boilerplate/`](../../SaoMiguelBus-api/boilerplate/); promoted to the API repo root on `revamp`. Provides feature toggles, allauth/OAuth, Stripe, Celery/Beat, DRF, legal/docs apps, and agent conventions (`.cursor/`, `services.py`, `api.py`). |
| **`boilerplate/`** | Vendored djast copy in the API repo before promotion; reference for layout and conventions |
| **`legacy/`** | Django 3.0 production API under `SaoMiguelBus-api/legacy/`; source DB + compat contract for migration |
| **Pay-to-Promote** | Monetization where listings are free; only boosting is paid |
| **Strangler-fig** | Migration pattern: new system grows around legacy until legacy is removed |
