# Azores Hub — Migration Plan & Software Design Document (SDD)

> **Status:** DRAFT — awaiting explicit approval before any implementation begins.
> **Author:** Architecture (Cursor agent)
> **Target repo:** `sao-miguel-hub` (first instance of the multi-island **Azores Hub** platform)
> **Source material:** legacy `SaoMiguelBus` (mobile), `SaoMiguelBus-api` (Django/DRF), `SaoMiguelBus-webapp` (vanilla-JS PWA)

This document is the **executive index** for the migration. The detailed design lives in the [`SDD/`](./SDD) directory. Nothing here authorizes writing application code — it defines the architecture and the phased plan we will execute **after sign-off**.

---

## 1. TL;DR

We are turning a single-purpose São Miguel bus-schedule app into **Azores Hub**: a white-labelable "island guide + community hub" that ships from one Expo (React Native + Web) codebase against a modernized, multi-tenant Django backend built on the `djast` boilerplate.

The legacy stack is functional but fragile:

- **Backend:** Django 3.0.14 (EOL), DRF function-views, **no relational schedule model** — a "schedule" is one `Route` row whose `stops` column is a *stringified Python dict* (`{'Stop A': '08h30', ...}`). Tracking is a single flat `Stat` table. Premium is a manual email allow-list. No `Island`/tenant concept.
- **Frontend:** a ~2,400-line `index.html` + ~5k lines of global-scoped JS, Tailwind via CDN, no build step, API base URL hardcoded, triple analytics stack (GA + Umami + `/api/v1/stat`).
- **Mobile:** parallel native-Android (Kotlin) and partial Flutter ports, each with their own embedded copy of the schedule.

Azores Hub consolidates all of this into **two repos** (one backend, one Expo app), introduces an `Island` tenant root that every domain model hangs off, a normalized transit schema, a unified `AnalyticsEvent` pipeline with GDPR-grade governance, and a freemium monetization layer.

See [`SDD/00-overview.md`](./SDD/00-overview.md) for the full vision and scope.

---

## 2. Guiding principles

1. **Tenant-first.** Every domain row is scoped to an `Island`. The query layer filters by the active island by default; cloning a new island is config + data, not code.
2. **One codebase, three targets.** Expo Router drives Android, iOS, and Web from a single source. Branding/theming is data, not forks.
3. **Privacy by design.** No raw IPs or stable user IDs in analytics without consent. Pseudonymized session hashing, automated retention, DSAR-ready schema.
4. **Backward-compatible cutover.** Legacy `/api/v1` and `/api/v2` contracts are preserved behind a compatibility shim so existing Play Store / web clients keep working during migration.
5. **Modular monolith, not microservices.** Each feature (Transit, News, Earthquakes, Marketplace, Trails, Traffic, Events) is a Django app + an Expo feature module sharing common tenant/analytics/consent infra.
6. **Don't lose history.** All data accumulated since 2020 (routes, stats, ads, subscriptions, likes) is migrated, normalized, and pseudonymized in flight.

---

## 3. Target architecture at a glance

```
                         ┌───────────────────────────────────────────┐
                         │            Expo app (RN + Web)              │
                         │  one codebase · Android · iOS · Web         │
                         │  theme/config injected per ISLAND_KEY       │
                         └───────────────┬─────────────────────────────┘
                                         │ HTTPS / JSON (X-Island header)
                                         ▼
        ┌────────────────────────────────────────────────────────────────┐
        │                  djast Django backend (modular monolith)         │
        │  tenancy · auth · analytics · consent · billing                  │
        │  ┌────────┬────────┬───────────┬─────────┬────────┬───────────┐  │
        │  │transit │ news   │earthquakes│market   │trails  │ traffic   │  │
        │  │        │        │           │place    │        │ events    │  │
        │  └────────┴────────┴───────────┴─────────┴────────┴───────────┘  │
        │  DRF ViewSets · PostgreSQL (tenant-scoped) · Celery + Redis      │
        └───────┬───────────────────────────────────┬──────────────────────┘
                │                                     │
        ┌───────▼────────┐                   ┌────────▼─────────────────────┐
        │ External feeds  │                   │ Monetization & infra          │
        │ EMSC seismic    │                   │ Stripe / RevenueCat           │
        │ dados.gov.pt    │                   │ AdMob / AdSense               │
        │ RSS news        │                   │ Viator affiliate              │
        │ Google Maps     │                   │ Object storage / CDN          │
        └─────────────────┘                   └───────────────────────────────┘
```

Full detail: [`SDD/01-architecture.md`](./SDD/01-architecture.md).

---

## 4. SDD index

| Doc | Contents |
|-----|----------|
| [`00-overview.md`](./SDD/00-overview.md) | Vision, scope, personas, glossary, success metrics |
| [`01-architecture.md`](./SDD/01-architecture.md) | System architecture, tech stack, repo layout, `djast` config, environments |
| [`02-multi-island-whitelabel.md`](./SDD/02-multi-island-whitelabel.md) | `Island`/`Hub` tenant root, request scoping, frontend theming config |
| [`03-data-model.md`](./SDD/03-data-model.md) | Full target schema per module + legacy→new field mapping |
| [`04-api-design.md`](./SDD/04-api-design.md) | REST conventions, versioning, auth, legacy compatibility shims |
| [`05-data-migration.md`](./SDD/05-data-migration.md) | ETL strategy for 2020+ data, `stops`-dict parsing, dual-write cutover |
| [`06-analytics-tracking.md`](./SDD/06-analytics-tracking.md) | `AnalyticsEvent` normalization, module-wide instrumentation |
| [`07-gdpr-data-governance.md`](./SDD/07-gdpr-data-governance.md) | CMP, pseudonymization, retention jobs, DSAR runbook |
| [`08-monetization-freemium.md`](./SDD/08-monetization-freemium.md) | Free/Premium tiers, Stripe + RevenueCat, ads, Pay-to-Promote |
| [`09-modules.md`](./SDD/09-modules.md) | News, Earthquakes, Marketplace, Trails/Tourist, Traffic, Events, Viator |
| [`10-frontend-architecture.md`](./SDD/10-frontend-architecture.md) | Expo Router layout, state, offline maps, CMP integration |
| [`11-security-auth.md`](./SDD/11-security-auth.md) | Identity, secrets, abuse/crowdsourcing trust, threat model |
| [`12-risks-open-questions.md`](./SDD/12-risks-open-questions.md) | Risks, assumptions, decisions needed before coding |

---

## 5. Phased migration plan

Each phase has an **objective**, **scope**, **exit criteria**, and **dependencies**. Phases are sequenced so that nothing later is blocked, and so the legacy app keeps running throughout. Effort is described in terms of subsystems touched and risk — not calendar time.

### Phase 0 — Foundations & sign-off (this document)

- **Objective:** agree the architecture, schema, and governance model.
- **Scope:** this SDD; provisioning the `sao-miguel-hub` repo; confirming `djast` capabilities; locking the external-API contracts (EMSC, dados.gov.pt, RSS sources).
- **Exit criteria:** stakeholder approval of the SDD; open questions in [`12-risks-open-questions.md`](./SDD/12-risks-open-questions.md) resolved or accepted.

### Phase 1 — Architecture, multi-island schema & migration strategy

- **Objective:** stand up the new backend skeleton with the tenant root and a working data-migration path.
- **Scope:**
  - Bootstrap `djast` backend; configure PostgreSQL, Celery + Redis, settings per environment ([`01`](./SDD/01-architecture.md)).
  - Implement the `Island`/`Hub` tenant root + request scoping middleware and `TenantScopedModel` base ([`02`](./SDD/02-multi-island-whitelabel.md)).
  - Define the **normalized transit schema** (`Operator`, `Line`, `Stop`, `Trip`, `StopTime`, `Calendar`) plus `Ad`, `Info`, `Holiday`, `RouteFeedback` ([`03`](./SDD/03-data-model.md)).
  - Build the **ETL** that parses legacy `Route.stops` stringified dicts, normalizes stop names via `cleaned_name`, and loads everything under `island=sao-miguel`. Dual-read validation against the legacy API ([`05`](./SDD/05-data-migration.md)).
  - Define the **legacy compatibility shim** mapping new schema → old `/api/v1` + `/api/v2` response shapes so current clients don't break ([`04`](./SDD/04-api-design.md)).
- **Exit criteria:** new backend serves São Miguel transit data through both the new API and the compat shim; migrated data byte-diff-validated against production `/api/v2/webapp/load`.
- **Depends on:** Phase 0.

### Phase 2 — GDPR/Analytics foundation, theming & Expo bootstrap

- **Objective:** privacy-safe analytics spine and the cross-platform app shell.
- **Scope:**
  - `AnalyticsEvent` model + ingestion endpoint + client SDK contract; deprecate flat `Stat` (migrate historical `Stat` rows into `AnalyticsEvent`) ([`06`](./SDD/06-analytics-tracking.md)).
  - Consent model, pseudonymized session hashing, Celery retention/anonymization tasks (14-month default), DSAR export/delete commands ([`07`](./SDD/07-gdpr-data-governance.md)).
  - Expo Router app skeleton: tab navigation, global theme provider driven by `ISLAND_NAME` / `PRIMARY_COLOR` / `SECONDARY_COLOR` / logos, i18n port of the 8 existing locales, CMP consent flow on first launch ([`02`](./SDD/02-multi-island-whitelabel.md), [`10`](./SDD/10-frontend-architecture.md)).
- **Exit criteria:** app boots on Android/iOS/Web with São Miguel branding; consent gate works; a sample event flows end-to-end into `AnalyticsEvent` only after consent; retention job verified on seeded data.
- **Depends on:** Phase 1 (tenant root, backend skeleton).

### Phase 3 — Core transit migration & external data integrations

- **Objective:** feature-parity transit experience + the daily-utility data feeds.
- **Scope:**
  - Port transit search (origin→destination, day-type, step-by-step directions via Google Maps proxy) onto the new schema and Expo UI; favorites, likes/dislikes, offline schedule cache ([`09`](./SDD/09-modules.md)).
  - **Trails:** Celery sync from `dados.gov.pt` open-data API → `Trail`/`TrailStage` models; offline map tiles + micro-climate weather ([`09`](./SDD/09-modules.md)).
  - **Earthquakes:** EMSC-CSEM polling → `SeismicEvent`; crowdsourced "I felt it" reports ([`09`](./SDD/09-modules.md)).
  - **News:** Celery RSS scraper/parser for Azorean journals → `NewsArticle` with source attribution ([`09`](./SDD/09-modules.md)).
- **Exit criteria:** São Miguel users get transit + trails + earthquakes + news in the new app; feeds refresh on schedule; all instrumented through `AnalyticsEvent`.
- **Depends on:** Phases 1–2.

### Phase 4 — Community & crowdsourced modules

- **Objective:** the "hub/community" surface area.
- **Scope:**
  - **Marketplace:** tradesperson directory (`ServiceProvider`, `ServiceCategory`, `Review`), free listings, moderation ([`09`](./SDD/09-modules.md)).
  - **Events:** community submission + moderation (`CommunityEvent`); Viator affiliate page migration for passive commission ([`09`](./SDD/09-modules.md)).
  - **Traffic (Waze-style):** `TrafficReport` (radar/accident/hazard) with geo + upvote/expiry trust model and GPS push notifications ([`09`](./SDD/09-modules.md), [`11`](./SDD/11-security-auth.md)).
- **Exit criteria:** users can browse providers, submit events, and post/confirm traffic reports; moderation tooling exists; abuse controls in place.
- **Depends on:** Phases 1–3 (tenant, analytics, auth, push infra).

### Phase 5 — Monetization

- **Objective:** turn on revenue.
- **Scope:**
  - **Subscriptions:** Stripe (web) + RevenueCat (iOS/Android IAP) → unified `Entitlement`; migrate legacy email allow-list subscribers ([`08`](./SDD/08-monetization-freemium.md)).
  - **Free tier ads:** AdMob (native) + AdSense (web), suppressed for premium; keep first-party `Ad` campaigns ([`08`](./SDD/08-monetization-freemium.md)).
  - **Pay-to-Promote:** boost mechanics for Marketplace providers and Events (`Promotion` model, no commissions/monthly fees) ([`08`](./SDD/08-monetization-freemium.md)).
  - **Premium features:** ad-free, real-time GPS alerts, personalized notifications.
- **Exit criteria:** a user can subscribe on each platform and lose ads; a provider/promoter can purchase a boost; entitlements reconcile across Stripe/RevenueCat webhooks.
- **Depends on:** Phases 1–4.

---

## 6. Cutover & rollback strategy

- **Strangler-fig:** new backend runs alongside legacy; the compat shim lets us migrate clients endpoint-by-endpoint. Legacy DB stays read-only-replicated into the new one during dual-run.
- **Per-island flag:** `Island.is_live` gates whether a tenant is served from new vs legacy.
- **Rollback:** because the shim preserves legacy response shapes and the legacy stack remains deployed, we can repoint DNS/API base back to legacy at any phase boundary.

Details: [`05-data-migration.md`](./SDD/05-data-migration.md).

---

## 7. Assumptions

- `djast` provides the Django project scaffold, opinionated settings, DRF wiring, Celery/Redis, and auth primitives. Where its specifics are unknown, the SDD flags assumptions explicitly in [`12-risks-open-questions.md`](./SDD/12-risks-open-questions.md).
- The new code lives in the `sao-miguel-hub` repo. These planning docs are committed to the legacy `SaoMiguelBus` repo only because `sao-miguel-hub` does not yet exist in this workspace; on approval they move into `sao-miguel-hub/SDD/`.
- External APIs (EMSC-CSEM, dados.gov.pt, Viator, Google Maps) remain available under their current terms; rate limits handled via cached Celery sync, not per-request proxying where avoidable.

---

## 8. Next step

**Review this plan and the [`SDD/`](./SDD) documents and approve (or annotate).** No implementation code, components, or API views will be written until approval is explicit.
