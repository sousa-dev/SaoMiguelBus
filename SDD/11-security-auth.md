# SDD 11 — Security, Auth & Trust

## 1. Identity model

| Actor | Mechanism |
|-------|-----------|
| Anonymous reader | No auth; read-only public endpoints; pseudonymous `session_hash` for analytics/votes |
| Registered user | **django-allauth** (email + Google/GitHub OAuth via boilerplate) + **DRF token** auth; required for account-bound favorites, reviews, event submissions, DSAR |
| Admin / operator | Django admin (`admin_interface` toggle) + role-based permissions |
| Service (Celery, webhooks) | Signed webhook secrets (Stripe via `stripe_payments`, RevenueCat), internal task auth |

Boilerplate provides: `user_management` (login middleware, OAuth signals), `axes` (brute-force lockout), `rest_framework` token auth. Azores Hub sets `AUTHENTICATION_REQUIRED=False` for public transit read APIs.

Anonymous-first stays true to the legacy public API, but **writes** that affect community trust require either an account or a signed anonymous session token.

## 2. Secrets — fixing legacy leaks

Legacy ships secrets to clients:
- Google Maps proxy key `AUTH_KEY` is **in client JS** (`...&key=SMBFj56xBCLc986j6odk3AK6fJa95k`).
- The Google Maps API key flows through the proxy but the proxy access key is exposed.
- A 128-char subscription-creation secret + a hardcoded `reset/likes` key exist server-side.

Azores Hub:
- **No third-party keys in the client.** Maps directions stay behind `transit` server proxy; clients call `/api/v3/transit/directions` with session/token, not a shared static key.
- Secrets in `src/src/.env` (djast convention — see `.env.example`), never committed, never shipped.
- Remove hardcoded admin "magic" keys (`/api/v2/reset/likes`, etc.); replace with Django admin + permissioned endpoints.

Env vars (new): `GOOGLE_MAPS_API_KEY`, `GMAPS_PROXY_AUTH_KEY` (server-only), `REVENUECAT_WEBHOOK_SECRET`, etc. — add via `/new-env-var` boilerplate workflow.

## 3. Tenancy isolation

- Active island resolved server-side from `X-Island`/subdomain; **never** trusted from request body.
- `tenancy.TenantManager` enforces island filtering at the ORM layer.
- Cross-tenant access only via explicit admin/Celery `for_island()`.

## 4. Crowdsourcing trust & abuse (traffic, reviews, events, felt reports)

| Risk | Control |
|------|---------|
| Spam / fake reports | Per-`session_hash`/IP-bucket rate limits (DRF throttles); CAPTCHA/app-attestation on suspicious volume |
| Vote manipulation (likes, confirmations) | One vote per session per target; confirmation decay; reputation weighting |
| Abusive content (reviews/events) | Moderation queue; profanity/PII filters; report-content flow |
| Stale/false alerts | Auto-expiry + confirmation-based confidence |
| Location spoofing | Plausibility checks (within `Island.radius_km`; speed/heading sanity) |

## 5. Transport & platform security

- HTTPS everywhere; HSTS.
- **CORS:** boilerplate uses `CORS_ALLOWED_ORIGINS` from env (not `CORS_ALLOW_ALL_ORIGINS=True` like legacy) — configure per deployment.
- **Brute-force:** `django-axes` already in boilerplate toggles.
- CSRF: DRF token auth for API; CSRF for session-cookie surfaces (allauth).
- Input validation via DRF serializers + analytics property-schema registry.
- Webhook signature verification: Stripe (`stripe_payments`), RevenueCat (`billing`).
- Rate limiting + WAF at the edge.

## 6. Privacy-security overlap

- Pseudonymization secret + rotating salt in `src/src/.env` ([`07`](./07-gdpr-data-governance.md)).
- DSAR endpoints (`consent` app) require strong identity verification before export/delete.
- Audit logs for admin/DSAR actions (no PII re-introduced).

## 7. Threat model summary

| Threat | Mitigation |
|--------|------------|
| Tenant data leakage | ORM-level tenant scoping, server-resolved island |
| Key/secret theft from client | No secrets in client; server-side proxy |
| Analytics re-identification | Rotating-salt session hashing, no IP/stable-ID |
| Crowdsourcing abuse | Rate limits, moderation, reputation, expiry |
| Payment fraud / entitlement spoofing | Server is source of truth; webhook verification; reconciliation job |
| Mass scraping | Throttling, pagination, caching |
