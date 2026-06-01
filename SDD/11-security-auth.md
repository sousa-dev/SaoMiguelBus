# SDD 11 — Security, Auth & Trust

## 1. Identity model

| Actor | Mechanism |
|-------|-----------|
| Anonymous reader | No auth; read-only public endpoints; pseudonymous `session_hash` for analytics/votes |
| Registered user | djast custom `User` + DRF token/JWT; required for account-bound favorites, reviews, event submissions, DSAR |
| Admin / operator | Django admin + role-based permissions; schedule/ad/moderation management |
| Service (Celery, webhooks) | Signed webhook secrets (Stripe/RevenueCat), internal task auth |

Anonymous-first stays true to the legacy public API, but **writes** that affect community trust require either an account or a signed anonymous session token.

## 2. Secrets — fixing legacy leaks

Legacy ships secrets to clients:
- Google Maps proxy key `AUTH_KEY` is **in client JS** (`...&key=SMBFj56xBCLc986j6odk3AK6fJa95k`).
- The Google Maps API key flows through the proxy but the proxy access key is exposed.
- A 128-char subscription-creation secret + a hardcoded `reset/likes` key exist server-side.

Azores Hub:
- **No third-party keys in the client.** Maps directions stay behind the server proxy; clients call `/transit/directions` with their normal session, not a shared static key.
- Secrets via environment/secret manager (djast convention), never committed, never shipped.
- Remove hardcoded admin "magic" keys; replace with proper admin auth + signed/permissioned endpoints.

## 3. Tenancy isolation

- Active island resolved server-side from `X-Island`/subdomain; **never** trusted from request body.
- `TenantManager` enforces island filtering at the ORM layer so a bug in a view can't leak another island's data.
- Cross-tenant access only via explicit admin/Celery `for_island()`.

## 4. Crowdsourcing trust & abuse (traffic, reviews, events, felt reports)

| Risk | Control |
|------|---------|
| Spam / fake reports | Per-`session_hash`/IP-bucket rate limits (DRF throttles); CAPTCHA/app-attestation on suspicious volume |
| Vote manipulation (likes, confirmations) | One vote per session per target; confirmation decay; reputation weighting |
| Abusive content (reviews/events) | Moderation queue; profanity/PII filters; report-content flow |
| Stale/false alerts | Auto-expiry + confirmation-based confidence |
| Location spoofing | Plausibility checks (within island radius; speed/heading sanity) |

## 5. Transport & platform security

- HTTPS everywhere; HSTS.
- CORS scoped to known origins (legacy uses `CORS_ALLOW_ALL_ORIGINS=True` — tighten).
- CSRF: token auth for API; proper CSRF for any session-cookie surfaces.
- Input validation via DRF serializers + property-schema registry for analytics.
- Webhook signature verification (Stripe/RevenueCat).
- Rate limiting + WAF at the edge.

## 6. Privacy-security overlap

- Pseudonymization secret + rotating salt stored in secret manager ([`07`](./07-gdpr-data-governance.md)).
- DSAR endpoints require strong identity verification before export/delete.
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
