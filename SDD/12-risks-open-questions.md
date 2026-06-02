# SDD 12 — Risks, Assumptions & Open Questions

Resolve product open questions **before Phase 1 coding**. Technical assumptions A1/A2 are **resolved** (see §1).

## 1. Resolved assumptions (no longer blocking)

| # | Was | Resolution |
|---|-----|------------|
| **A1** | djast capabilities unknown | **Resolved.** Vendored at `SaoMiguelBus-api/boilerplate/`: Django 5, feature toggles, DRF, CORS, allauth+OAuth, axes, Stripe (`stripe_payments`), Celery+Beat, Redis cache, legal/docs apps, Docker Compose, `.cursor/` agent tooling. See [`01-architecture.md`](./01-architecture.md) §2. |
| **A2** | Repo location TBD | **Resolved.** New backend at **`SaoMiguelBus-api` repo root** (`revamp` branch); promote `boilerplate/` → root. Legacy in `legacy/`. SDD stays in **`SaoMiguelBus/SDD/`**. Expo client in `SaoMiguelBus`. |

## 2. Assumptions still to confirm

| # | Assumption | Impact if wrong |
|---|------------|-----------------|
| A3 | Legacy production Postgres accessible (read replica/dump) for ETL | Fallback: `legacy/src/db.sqlite3` + `data.json` + `scripts/csv/` — partial history |
| A4 | EMSC-CSEM, dados.gov.pt, Viator, Google Maps remain available | Feed-dependent modules at risk |
| A5 | Reusing GA (`G-YSWK1F7F0B`) + Umami, consent-gated | May drop one to simplify |

## 3. Open questions (need product/stakeholder decision)

1. ~~**Mobile distribution:** keep Play Store listing (`com.hsousa_apps.Autocarros`) and update to Expo, or new app?~~ **Resolved:** ship as an **in-place update** — keep Android package `com.hsousa_apps.Autocarros` (pinned in `app.json` → `android.package`); rebrand display name **São Miguel Bus → São Miguel Hub** only.
2. **Multi-tenant vs single-tenant deploy:** one backend for many islands vs one deployment per island?
3. **"Real-time GPS alerts":** device-GPS proximity OK for v1 (no operator vehicle feed today)?
4. **Retention window:** 14 months default — legal sign-off; per-island override?
5. **News RSS legality:** link-out + summary only per journal terms?
6. **Consent for migrated users:** re-prompt on first new-app launch vs aggregate-only legacy analytics?
7. **Pricing:** reuse €0.99/€1.99/€19.99 or re-model?
8. **Reviews/UGC identity:** anonymous session vs account required?
9. **Offline map tiles:** MBTiles licensing + storage budget per island?
10. **Desktop web:** retire legacy desktop variant for Expo Web only?

## 4. Technical risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `Route.stops` parsing edge cases | High | `ast.literal_eval` + per-row logging + manual queue; [`05`](./05-data-migration.md) |
| Unmatched stop names | Medium | Trigram + CSV/groups backfill + review list |
| Search parity regressions | Medium | `validate_legacy_parity` + compat shim |
| Client cutover breakage | Medium | Full compat inventory ([`04`](./04-api-design.md) §4); strangler-fig |
| External feed outages | Medium | Celery cache + backoff |
| IAP vs Stripe mismatch | Medium | RevenueCat + `stripe_payments` + unified `Entitlement` |
| Crowdsourcing abuse | Medium | [`11`](./11-security-auth.md) |
| Analytics volume | Medium | Partitioning + rollups + retention |
| Scope creep (7 modules) | High | `feature_flags`; transit-first |

## 5. Explicitly deferred

- Live operator vehicle GPS.
- Non-Azores regions.
- Replacing Google Maps.
- ML recommendations beyond basic personalization.

## 6. Decision log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-01 | Backend foundation = djast boilerplate at `SaoMiguelBus-api/boilerplate/`, promoted to root | Concrete starter; feature toggles + Stripe + Celery + auth already wired |
| 2026-06-01 | SDD + planning in `SaoMiguelBus/SDD/`; API implementation in `SaoMiguelBus-api` | Matches `revamp` README layout |
| 2026-06-01 | Legacy import via `import_legacy` + `migrate_legacy <step>` | Idempotent, one-command operator workflow |
| 2026-06-01 | Compat API substitutes legacy for web PWA | Drop-in cutover: same URLs/shapes; revamp validated on staging |
| 2026-06-01 | Batched JSONL import + Celery async for large exports | Avoids OOM on 400MB+ exports; `LegacyImportJob` tracks progress |
| 2026-06-01 | Tenancy: no hostname island parsing | Prevents `unknown_island: staging` / IP octet bugs; fallback to `DEFAULT_ISLAND_KEY` |
| 2026-06-02 | Viator tours via Partner API proxy, not widget/DB | `events` app: `viator_client.py` + Redis cache; mobile native list/detail; `Linking.openURL` for booking |
| 2026-06-02 | Tours tab gated by `feature_flags.events` | Bootstrap `enabledModules`; static client merge keeps tab if API lags; API does not enforce flag on `/events/tours` |
