# SDD 12 — Risks, Assumptions & Open Questions

Resolve or accept these **before Phase 1 coding**.

## 1. Assumptions to confirm

| # | Assumption | Impact if wrong |
|---|------------|-----------------|
| A1 | `djast` provides project scaffold, settings split, DRF/CORS, Celery/Redis, custom `User`, secret loading. | If it lacks Celery/auth, Phase 1/2 scope grows. |
| A2 | New code lives in `sao-miguel-hub`; these docs move there on approval (committed to legacy `SaoMiguelBus` repo only because the new repo isn't in this workspace yet). | Repo provisioning is a Phase 0 task. |
| A3 | Legacy production Postgres is accessible (read replica/dump) for ETL. | Without it, only `data.json` + `scripts/` seed data available — partial history. |
| A4 | EMSC-CSEM, dados.gov.pt, Viator, Google Maps remain available under current terms/limits. | Feed-dependent modules (earthquakes, trails, tours, directions) at risk. |
| A5 | Reusing GA (`G-YSWK1F7F0B`) + self-hosted Umami is desired, now consent-gated. | May choose to drop one to simplify. |

## 2. Open questions (need product/stakeholder decision)

1. **Mobile distribution:** keep the existing Play Store listing (`com.hsousa_apps.Autocarros`) and update it to the Expo build, or publish a new app? Affects store continuity, reviews, install base.
2. **Multi-tenant vs single-tenant deploy:** one backend serving many islands, or one deployment per island? Schema supports both; ops/cost/isolation tradeoff.
3. **"Real-time GPS alerts" definition:** confirmed there is **no live operator vehicle feed** today (legacy tracking is schedule math). Is device-GPS proximity alerting an acceptable v1 for the premium feature, with live vehicle data deferred until operator partnerships exist?
4. **Retention window:** 14 months proposed as default — confirm per legal guidance; per-island override needed?
5. **News scraping legality:** confirm RSS terms for each Azorean journal; link-out + summary only (no full-text republish) acceptable?
6. **Consent default for existing users:** migrated users are pre-CMP. Re-prompt all on first launch of new app (proposed) vs treat legacy analytics as aggregate-only?
7. **Pricing:** reuse legacy €0.99/€1.99/€19.99, or re-model for the expanded multi-module product?
8. **Reviews/UGC identity:** allow anonymous reviews (session-based) or require account? Affects abuse + DSAR.
9. **Offline map tiles:** licensing/source for MBTiles (OSM-based) and storage budget per island.
10. **Desktop web experience:** retire the legacy `desktop/` variant in favor of responsive Expo Web, or preserve a distinct desktop layout?

## 3. Technical risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `Route.stops` stringified-dict parsing edge cases (malformed entries, duplicate stop names, odd time formats) | High | Robust `ast.literal_eval` ETL with per-row error logging + manual-review queue; parity validation gate ([`05`](./05-data-migration.md)) |
| Unmatched/duplicate stop names breaking FK resolution | Medium | Trigram fuzzy match + coordinate backfill + flagged review list |
| Search-result parity regressions vs legacy | Medium | Recorded request/response matrix diffed pre-cutover |
| Client cutover breaking in-the-wild apps | Medium | Compat shim preserving v1/v2 shapes; strangler-fig with legacy fallback |
| External feed rate limits / outages (EMSC, dados.gov.pt, RSS) | Medium | Cached Celery sync, backoff, stale-while-revalidate |
| App-store IAP rules vs Stripe-on-web mismatch | Medium | RevenueCat for mobile, Stripe for web, unified `Entitlement` |
| Crowdsourcing abuse at launch | Medium | Rate limits, moderation, reputation, expiry ([`11`](./11-security-auth.md)) |
| Analytics table volume (append-only) | Medium | Partitioning + aggregate rollups + retention purge ([`06`](./06-analytics-tracking.md),[`07`](./07-gdpr-data-governance.md)) |
| Scope creep across 7 modules | High | Phased plan; modules gated by `feature_flags`; transit-first parity before new modules |

## 4. Explicitly deferred

- Live operator vehicle GPS (needs partnerships).
- Non-Azores regions (architecture supports, not in initial scope).
- Replacing Google Maps as directions provider.
- ML/personalized recommendations beyond basic personalization.

## 5. Decision log (to be filled during review)

| Date | Decision | Rationale |
|------|----------|-----------|
| _TBD_ | _awaiting approval of this SDD_ | — |
