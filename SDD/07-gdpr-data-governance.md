# SDD 07 — GDPR Compliance & Data Governance

Strict requirement. Privacy is designed in, not bolted on. Four pillars: **data minimization/anonymization**, **consent**, **retention**, **DSAR readiness**.

## 1. Data minimization & pseudonymization

- **No raw IP addresses** persisted with analytics. If IP is needed transiently (geo, abuse), it is used in-memory and discarded; never written to `AnalyticsEvent`.
- **No stable user IDs** in analytics unless the user is authenticated *and* consented to personalization.
- **Session hashing:** clients/anonymous sessions are identified by a `session_hash`:
  ```
  session_hash = HMAC_SHA256(server_secret, raw_session_id + island_key + rotating_salt)
  ```
  - `rotating_salt` rotates (e.g. daily) so hashes are **not** linkable across long periods → pseudonymous, not a permanent identifier.
  - Without analytics consent, `session_hash` is `NULL` and only aggregate counters increment.
- Free-text fields that could carry PII (reviews, event descriptions, traffic notes) are flagged as "user content," subject to DSAR, and never copied into analytics.

## 2. Consent Management Platform (CMP)

Frontend flow ([`10-frontend-architecture.md`](./10-frontend-architecture.md)):

```
First launch → CMP screen (before GA/Umami/AdMob/AdSense load, before any AnalyticsEvent)
  Purposes (granular, default OFF except strictly-necessary):
    - strictly_necessary   (always on; app function, security)
    - analytics            (first-party AnalyticsEvent with session_hash, GA/Umami)
    - ads                  (AdMob/AdSense personalization)
    - personalization      (notifications, recommendations, account linkage)
  Actions: Accept all · Reject all (non-essential) · Customize
```

Backend `ConsentRecord` (`consent` app — `src/consent/`) stores the granular choices, `policy_version`, timestamps. Every `AnalyticsEvent` carries a `consent_state` snapshot. Withdrawal is one tap and propagates immediately (subsequent events respect it; third-party SDKs are torn down).

**Policy pages:** reuse boilerplate `legal` app (`src/legal/data/privacy_policy.json`, `terms_of_service.json`) — update JSON for Azores Hub; link from CMP and settings.

**Key fix vs legacy:** GA and AdSense currently load unconditionally on page load — that is non-compliant. In Azores Hub, **nothing tracking-related initializes before consent**.

## 3. Retention policies (automated)

Celery Beat jobs per island (default window **14 months**, configurable per `Island`), implemented as `@shared_task` in `consent/tasks.py` and `analytics/tasks.py`, scheduled via django-celery-beat admin (boilerplate pattern):

| Job | Cadence | Action |
|-----|---------|--------|
| `anonymize_analytics` | daily | For `AnalyticsEvent` older than retention: drop `session_hash`, strip identifying `properties`, keep only aggregate-safe fields (or roll into summary tables, then delete rows). |
| `purge_expired_reports` | hourly | Delete expired `TrafficReport`/`FeltReport` row-level detail. |
| `rotate_session_salt` | daily | Rotate the pseudonymization salt. |
| `expire_consent` | daily | Re-prompt when `policy_version` changes. |
| `purge_orphaned_media` | weekly | Remove unreferenced uploads. |

Retention windows are stored as data (`Island` + a `RetentionPolicy` config), not hardcoded, so each tenant can comply with local guidance.

## 4. DSAR readiness (export & erasure)

The schema is built so a subject's data is findable and deletable:

- Everything tied to a person links via `user` FK **or** `session_hash`.
- Management commands / admin actions:
  - `dsar_export <user|session_hash>` → machine-readable bundle (JSON) of all rows across modules (account, consent, reviews, events, reports, favorites, entitlements, non-anonymized analytics).
  - `dsar_delete <user|session_hash>` → erase or anonymize across all apps in one transaction; emits an audit record (without re-introducing PII).
- API endpoints `POST /api/v3/privacy/dsar/export` and `/delete` (authenticated; identity verification required) back self-service requests.
- An **audit log** records DSAR fulfillment (who/when/scope) for accountability.

## 5. Data governance summary

| Principle | Mechanism |
|-----------|-----------|
| Lawful basis | Consent (analytics/ads/personalization) + legitimate interest (security, strictly-necessary) |
| Minimization | No IP/stable-ID in analytics; session hashing; property schema validation |
| Purpose limitation | `consent_state` snapshot per event; SDKs gated per purpose |
| Storage limitation | Automated retention/anonymization Celery jobs |
| Right of access/erasure | DSAR export/delete commands + endpoints + audit log |
| Transparency | Versioned policy; CMP re-prompt on changes |
| Cross-border | Data residency configurable per deployment (EU region) |

## 6. Third-party processors

GA, Umami, AdMob/AdSense, Stripe, RevenueCat, Viator, Google Maps, EMSC, dados.gov.pt — each documented in a processor register with its purpose, consent dependency, and data shared. GA/Umami/Ads are **consent-gated**; functional processors (Maps proxy, billing) operate on legitimate-interest/contract basis with minimization.
